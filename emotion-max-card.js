// Save this code as 'emotion-max-card.js' in your <config>/www/ directory.
// Then add it as a resource in Home Assistant:
// Configuration > Dashboards > More Options > Resources > Add Resource
// URL: /local/emotion-max-card.js
// Resource Type: JavaScript Module

console.info('%c EMOTION-MAX-CARD %c IS INSTALLED (DEBUG MODE) ', 'color: #333; background: #b92938; font-weight: bold;', 'color: #fff; background: #333;');

const CARD_VERSION = '1.1.0-canvas'; // Updated version

class EmotionMaxCard extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._hass = null;
		this._devices = [];
		this._selectedDeviceUniqueId = null;
		this._trail = [];
		this._currentPos = null;
		this._lastPos = null;

		// Canvas related properties
		this._canvas = null;
		this._ctx = null;
		this._gridSize = 100;
		this._cellSize = 0;
		this._resizeObserver = null;
	}

	// This is the function Home Assistant calls whenever an entity changes state
	set hass(hass) {
		const isInitialLoad = !this._hass;
		this._hass = hass;

		if (isInitialLoad) {
			this._discoverDevices(hass);
			this._setupCard();
		}

		if (this._selectedDeviceUniqueId) {
			this._updatePosition();
		}
	}

	// Discover compatible sensors (No changes needed here)
	_discoverDevices(hass) {
		console.log("--- [DEBUG] Starting device discovery ---");
		console.log("[DEBUG] Full hass object:", hass);
		const allEntities = Object.values(hass.entities);
		const seenDeviceIds = new Set();

		for (const entity of allEntities) {
			const deviceId = entity.device_id;
			if (deviceId && !seenDeviceIds.has(deviceId)) {
				const device = hass.devices[deviceId];
				seenDeviceIds.add(deviceId);

				if (device && device.manufacturer === 'LinknLink' && device.model.startsWith('eMotion Max')) {
					console.log(`%c[DEBUG] MATCH FOUND! Device:`, 'color: green; font-weight: bold;', device);
					const match = entity.entity_id.match(/lnlinkha_([a-f0-9]+)/);
					if (match && match[1]) {
						const uniqueId = match[1];
						console.log(`%c[DEBUG] Extracted uniqueId: ${uniqueId}`, 'color: green;');
						if (!this._devices.some(d => d.uniqueId === uniqueId)) {
							this._devices.push({
								name: device.name_by_user || device.name,
								uniqueId: uniqueId,
							});
						}
					}
				}
			}
		}
		console.log("[DEBUG] --- Device discovery finished ---");
	}

	// Create the card's initial HTML structure
	_setupCard() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
				}
				#controls {
					padding: 8px;
				}
				select {
					width: 100%;
					padding: 8px;
					/*margin-bottom: 16px;*/
					border-radius: 4px;
					border: 1px solid #ccc;
				}
				button {
					width: 100%;
					padding: 10px;
					border: none;
					border-radius: 4px;
					background-color: var(--primary-color);
					color: var(--text-primary-color);
					cursor: pointer;
					font-weight: bold;
				}
				button:hover {
					opacity: 0.8;
				}
				/* REIMPLEMENTATION: Style for the canvas */
				#grid-canvas {
					width: 100%;
					aspect-ratio: 1 / 1;
					background-color: #ffffff;
					border: 1px solid #ccc;
					box-sizing: border-box;
				}
			</style>
		`;

		const card = document.createElement('ha-card');
		card.header = 'eMotion Presence';

		const content = document.createElement('div');
		const controls = document.createElement('div');
		controls.id = 'controls';

		// Dropdown controls
		const selectControls = document.createElement('div');
		selectControls.id = 'controls';
		const select = document.createElement('select');
		select.addEventListener('change', this._handleDeviceChange.bind(this));
		const defaultOption = document.createElement('option');
		defaultOption.value = '';
		defaultOption.textContent = 'Select a Sensor...';
		select.appendChild(defaultOption);
		this._devices.forEach(device => {
			const option = document.createElement('option');
			option.value = device.uniqueId;
			option.textContent = device.name;
			select.appendChild(option);
		});
		selectControls.appendChild(select);
		content.appendChild(selectControls);

		// REIMPLEMENTATION: Create canvas instead of divs
		this._canvas = document.createElement('canvas');
		this._canvas.id = 'grid-canvas';
		this._ctx = this._canvas.getContext('2d');
		content.appendChild(this._canvas);

		// NEW: Separate div for the clear button
		const buttonControls = document.createElement('div');
		buttonControls.id = 'controls';
		const clearButton = document.createElement('button');
		clearButton.textContent = 'Clear Movement Trails';
		clearButton.addEventListener('click', this._clearTrailAndRedraw.bind(this));
		buttonControls.appendChild(clearButton);
		content.appendChild(buttonControls);

		card.appendChild(content);
		this.shadowRoot.appendChild(card);

		// REIMPLEMENTATION: Use ResizeObserver to handle canvas resizing
		this._resizeObserver = new ResizeObserver(() => this._initializeCanvas());
		this._resizeObserver.observe(this._canvas);
	}

	// REIMPLEMENTATION: Set canvas dimensions and draw the static grid background
	_initializeCanvas() {
		const canvasSize = this._canvas.clientWidth;
		this._canvas.width = canvasSize;
		this._canvas.height = canvasSize;
		this._cellSize = canvasSize / this._gridSize;
		this._drawGridLines();
		this._drawAllPoints(); // Redraw points after resize
	}

	_clearTrailAndRedraw() {
		this._trail = [];
		this._currentPos = null;
		this._lastPos = null;
		this._drawAllPoints();
	}

	_handleDeviceChange(event) {
		this._selectedDeviceUniqueId = event.target.value;
		this._clearTrailAndRedraw();
		if (this._selectedDeviceUniqueId) {
			this._updatePosition();
		}
	}

	// REIMPLEMENTATION: This function now only updates data. Drawing is handled separately.
	_updatePosition() {
		if (!this._hass || !this._selectedDeviceUniqueId) return;

		const xEntityId = `sensor.lnlinkha_${this._selectedDeviceUniqueId}_7`;
		const yEntityId = `sensor.lnlinkha_${this._selectedDeviceUniqueId}_8`;

		const xState = this._hass.states[xEntityId];
		const yState = this._hass.states[yEntityId];

		if (xState && yState && xState.state !== 'unknown' && yState.state !== 'unknown') {
			const x = parseFloat(xState.state);
			const y = parseFloat(yState.state);

			if (x === 0 && y === 0) return;

			// ATOMIC UPDATE: Only proceed if the (x, y) pair is new.
			if (this._lastPos && this._lastPos.x === x && this._lastPos.y === y) {
				return;
			}

			this._lastPos = { x, y };

			if (this._currentPos) {
				this._trail.unshift(this._currentPos);
			}

			this._currentPos = this._mapCoordsToGrid(x, y);
			this._drawAllPoints();
		}
	}

	_mapCoordsToGrid(sensorX, sensorY) {
		const gridMax = this._gridSize - 1;

		const adjustedX = sensorX + 4;
		let gridX = gridMax - Math.round((adjustedX / 8) * gridMax);
		let gridY = Math.round((sensorY / 8) * gridMax);

		gridX = Math.max(0, Math.min(gridMax, gridX));
		gridY = Math.max(0, Math.min(gridMax, gridY));

		return { x: gridX, y: gridY };
	}

	// REIMPLEMENTATION: Draws the light blue grid lines
	_drawGridLines() {
		this._ctx.strokeStyle = '#cae9ff';
		this._ctx.lineWidth = 1;

		for (let i = 0; i <= this._gridSize; i++) {
			// Vertical lines
			this._ctx.beginPath();
			this._ctx.moveTo(i * this._cellSize, 0);
			this._ctx.lineTo(i * this._cellSize, this._canvas.height);
			this._ctx.stroke();

			// Horizontal lines
			this._ctx.beginPath();
			this._ctx.moveTo(0, i * this._cellSize);
			this._ctx.lineTo(this._canvas.width, i * this._cellSize);
			this._ctx.stroke();
		}
	}

	// REIMPLEMENTATION: Central drawing function
	_drawAllPoints() {
		if (!this._ctx) return;

		// Clear previous drawings
		this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		// Redraw the grid background
		this._drawGridLines();

		// Draw trail
		this._ctx.fillStyle = '#FF0000'; // Pure Red
		this._trail.forEach(pos => {
			this._ctx.fillRect(pos.x * this._cellSize, pos.y * this._cellSize, this._cellSize, this._cellSize);
		});

		// Draw current position
		if (this._currentPos) {
			this._ctx.fillStyle = '#0000FF'; // Pure Blue
			this._ctx.fillRect(this._currentPos.x * this._cellSize, this._currentPos.y * this._cellSize, this._cellSize, this._cellSize);
		}
	}

	setConfig(config) {}

	getCardSize() {
		return 15;
	}

	// Cleanup observer when card is removed
	disconnectedCallback() {
		if (this._resizeObserver) {
			this._resizeObserver.disconnect();
		}
	}
}

customElements.define('emotion-max-card', EmotionMaxCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "emotion-max-card",
  name: "eMotion Max Presence Card",
  description: "A card to display presence data from eMotion Max sensors.",
  preview: true,
});


# eMotion Max Tracker

This is a custom card for eMotion Max sensors that shows realtime movement and movement trails across a high resolution 100x100 grid. This custom card for Home Assistant provides a significant improvement in resolution over the default LinkNLink app, giving you a more detailed view of motion and occupancy in your space.

---

## Features

- **High-Resolution Grid**: Visualize motion on a detailed 100x100 grid, revealing subtle movements and occupancy patterns that the standard app misses.
- **Real-Time Tracking**: See the location of a person in real-time as they move through the sensor's field of view.
- **Seamless Integration**: Easily integrates with your existing LinkNLink eMotion Max sensors via Home Assistant.

---

## Installation via HACS (*preferred method*)

1.  **Open HACS** on your Home Assistant dashboard.
2.  Click the three dots in the top right corner and select **Custom repositories**.
3.  In the "Repository" field, enter **https://github.com/DavidSpivey/eMotion-Tracker**
4.  In the "Category" dropdown, select **Dashboard**.
5.  Click **Add** and **Close** the Custom Repositories box.
6.  Search for **eMotion Max Motion Card** and click on it.
7.  Click **DOWNLOAD** at the bottom right.
8.  Click **DOWNLOAD** on the box that pops up
9.  When Prompted, click **RELOAD** to prepare your dashboard for the custom card.

## Adding the Card to Your Dashboard

1.  In any Home Assistant custom dashboard (**not Overview**), click the three dots in the top right corner and select **Edit Dashboard**.
2.  Click the **Add Card** button.
3.  Search for "eMotion Max Presence Card" and select it.
4.  Save the changes to your dashboard.
5.  Select your sensor from the dropdown list within the card's controls to begin seeing motion.

---

## Manual Installation

1.  Download the `emotion-max-card.js` file from the GitHub repository.
2.  Place the file inside the `www` directory of your Home Assistant configuration folder.
3.  Add the resource to Home Assistant:
    * Go to **Settings** > **Dashboards** > **Resources**.
    * Click **Add Resource**.
    * For the URL, enter `/local/emotion-max-card.js`.
    * Select **JavaScript Module** as the "Resource Type."
    * Click **Create**.

---

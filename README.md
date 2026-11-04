# Ankit Health Tracker

A private five-month dashboard with egg-free vegetarian meals and daily weight/activity charts. Google Sheets stores the data. The app does not ship credentials or check-ins in the public site files. Report meals, quantities, weigh-ins and activity in the tracker chat. Update the Sheet there, then use Refresh from Sheets on the dashboard.

## Connect the private Sheet

1. In Google Cloud, enable the Google Sheets API in a project, then create a service account and generate a JSON key. Share the tracker spreadsheet with the service account's email as an Editor. Keep the spreadsheet private.
2. In `.env.local` (local preview) or the Vercel project environment (hosted app), set `GOOGLE_SHEET_ID` to the spreadsheet ID, `GOOGLE_SERVICE_ACCOUNT_JSON` to the complete key JSON on one line, and `TRACKER_ACCESS_KEY` to a randomly generated password of at least 32 characters. Keep these values in your password manager. The private `.env.vercel.local` file lists the required keys for bulk import.
3. Run `npm start` on Node.js 24, visit http://127.0.0.1:4173 and enter the access key.
4. Import the GitHub repo into a free Vercel project using the Other framework preset. Import the environment variables and deploy. Open the production URL on your phone and check that meals, food log and progress load.

The expected tabs are `Daily Meals` (Date, Meal, Dish, Ingredients per serving, Prep, Nutrient notes, optional Image URL) and `Progress` (Date, Weight (kg), Activity (min), Notes, Saved at), plus the Food Log tab (Date, Meal, Food, Quantity, Notes, Logged at). Keep the column order. The Codex meal schedule is managed separately from hosting.

Meal portions are starting suggestions. The menus follow general [NHS vegetarian nutrition guidance](https://www.nhs.uk/live-well/eat-well/how-to-eat-a-balanced-diet/the-vegetarian-diet/). The gym plan is pending the equipment video.

## Local preview

Run npm start and open http://127.0.0.1:4173/?preview=1 for illustrative data. The preview uses no Google credentials. For a meal photo, put a browser-accessible HTTPS image URL in the last Daily Meals column. Leave the cell blank when a photo is unavailable.
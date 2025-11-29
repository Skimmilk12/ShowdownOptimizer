// ===========================================
// GOOGLE APPS SCRIPT - Deploy this in Google
// ===========================================
//
// SETUP INSTRUCTIONS:
// 1. Go to https://script.google.com/
// 2. Click "New Project"
// 3. Delete the default code and paste ALL of this code
// 4. Click "Deploy" > "New deployment"
// 5. Select "Web app" as the type
// 6. Set "Execute as" to "Me"
// 7. Set "Who has access" to "Anyone"
// 8. Click "Deploy" and AUTHORIZE when prompted
// 9. Copy the Web App URL (NOT the script editor URL!)
// 10. Paste that URL in ShowdownOptimizer's Setup Auto-Push
//
// IMPORTANT: After updating this code, you must create a NEW deployment!
// Go to Deploy > New deployment (not "Manage deployments")
//
// The URL will look like: https://script.google.com/macros/s/XXXXX/exec
// Make sure it ends with /exec, NOT /dev

// Your Google Sheet IDs (already configured for your sheets)
const SHEET_IDS = {
  QB: '1nmPFQ1P1y8N0WPxHOq_FUEuBhSAW6ddLecsuRjyOqHo',
  RB: '1C8UDTi_jXMRE4MHy5Zt4nNkCxKR22QVoXGCWiTAAuaM',
  WR: '1MXTV7mLSLywoslITmHrbjcIKBK2c99RVdteDHxA9dv8',
  TE: '1hRlW5XhqKeSzWE1-E0RHKwUdt99fnUM2zzwk3QDborQ',
  DST: '1RNKJDGegnWt7G7Pmxo6kwHZGTIvvDIyOaTp9racjol8'
};

// Handle POST requests from ShowdownOptimizer
function doPost(e) {
  try {
    // Parse the incoming data (could be JSON body or form data)
    let data;

    if (e.postData && e.postData.contents) {
      // Direct JSON body
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      // Form data with 'data' field
      data = JSON.parse(e.parameter.data);
    } else {
      return createResponse({ success: false, error: 'No data received' });
    }

    const position = data.position;
    const records = data.records;

    if (!position || !records || !SHEET_IDS[position]) {
      return createResponse({
        success: false,
        error: 'Invalid position or no records. Position: ' + position
      });
    }

    // Open the correct sheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_IDS[position]);
    const sheet = spreadsheet.getSheets()[0]; // First sheet

    // Get existing data to find where to insert
    const existingData = sheet.getDataRange().getValues();

    let addedCount = 0;

    // Process each record
    records.forEach(function(record) {
      // Build the full row with all columns
      // Format: Name, Position, Team, Week, Opponent, Result, [stats...], FPTS, Salary
      const row = [
        record.name,
        record.position,
        record.team || '',
        record.week,
        record.opponent || '',
        record.result || ''
      ];

      // Add all stats (if they exist)
      if (record.stats && Array.isArray(record.stats)) {
        record.stats.forEach(function(stat) {
          row.push(stat);
        });
      }

      // Add FPTS and Salary at the end
      row.push(record.fpts);
      row.push(record.salaryFormatted || ('$' + record.salary));

      // Find the right position to insert (after header, grouped by player name)
      let insertRow = findInsertPosition(sheet, record.name, record.week);

      // Insert the row
      sheet.insertRowAfter(insertRow);
      sheet.getRange(insertRow + 1, 1, 1, row.length).setValues([row]);

      addedCount++;
    });

    return createResponse({
      success: true,
      added: addedCount,
      position: position,
      message: 'Added ' + addedCount + ' records to ' + position + ' sheet'
    });

  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Find the row position to insert a new record
// Groups records by player name and sorts by week (descending - highest week first)
function findInsertPosition(sheet, playerName, newWeek) {
  const data = sheet.getDataRange().getValues();

  // Start after header row (row 1)
  let insertAfterRow = 1;
  let foundPlayer = false;
  let lastPlayerRow = 1;

  // Find where this player's records are (or where they should go alphabetically)
  for (let i = 1; i < data.length; i++) {
    const rowPlayerName = data[i][0]; // Column A = Player name
    const rowWeek = parseInt(data[i][3]) || 0; // Column D = Week

    if (rowPlayerName === playerName) {
      foundPlayer = true;
      lastPlayerRow = i + 1; // +1 because sheets are 1-indexed

      // If this row has a lower week number, insert before it
      if (rowWeek < newWeek) {
        return i; // Insert at this position (pushes this row down)
      }
    } else if (foundPlayer) {
      // We've passed all of this player's rows
      // Insert at the end of their section
      return lastPlayerRow;
    } else if (rowPlayerName > playerName && !foundPlayer) {
      // This player should go before this row alphabetically
      return i;
    }
  }

  // If player was found but we're at the end, insert after last row
  if (foundPlayer) {
    return lastPlayerRow;
  }

  // If player not found at all, add at the end
  return data.length;
}

// Handle GET requests (for testing)
function doGet(e) {
  return createResponse({
    status: 'OK',
    message: 'ShowdownOptimizer API is running. Use POST to add data.',
    sheets: Object.keys(SHEET_IDS)
  });
}

// Helper to create JSON response with CORS headers
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = null;
    if (e && e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e && e.parameter) {
      raw = JSON.stringify(e.parameter);
    }

    var payload = {};
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (err) {
        // fallback: try to parse as query-like string
        payload = e && e.parameter ? e.parameter : {};
      }
    }

    var lat = Number(payload.lat || payload.latitude || payload.latitude_deg || payload.latitude_deg || payload.lat0 || payload.latitude0 || payload.latLngLat || payload.latlng_lat || payload.latitude);
    var lon = Number(payload.lon || payload.lng || payload.longitude || payload.longitude_deg || payload.lon0 || payload.longitude0 || payload.latLngLon || payload.latlng_lon || payload.longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return ContentService.createTextOutput(JSON.stringify({ error: "no_coordinates" })).setMimeType(ContentService.MimeType.JSON);
    }

    var props = PropertiesService.getScriptProperties();
    var homeLat = Number(props.getProperty('HOME_LAT') || '0');
    var homeLon = Number(props.getProperty('HOME_LON') || '0');
    var radius = Number(props.getProperty('HOME_RADIUS') || '150'); // meters

    // Validate HOME_LAT and HOME_LON configuration
    if (isNaN(homeLat) || isNaN(homeLon) || homeLat === 0 && homeLon === 0) {
      var homeLat_raw = props.getProperty('HOME_LAT');
      var homeLon_raw = props.getProperty('HOME_LON');
      if (!homeLat_raw || !homeLon_raw) {
        var errorMsg = 'Configuration error: HOME_LAT and HOME_LON must be set in script properties';
        Logger.log(errorMsg);
        throw new Error(errorMsg);
      }
      if (isNaN(homeLat) || isNaN(homeLon)) {
        var parseMsg = 'Configuration error: HOME_LAT and HOME_LON must be valid numbers';
        Logger.log(parseMsg);
        throw new Error(parseMsg);
      }
    }

    var distance = calcDistanceMeters(lat, lon, homeLat, homeLon);
    var status = distance <= radius ? '在宅' : '外出';

    props.setProperty('HOME_STATUS', status);
    props.setProperty('HOME_LAST_LAT', String(lat));
    props.setProperty('HOME_LAST_LON', String(lon));
    props.setProperty('HOME_LAST_DISTANCE', String(distance));
    props.setProperty('HOME_LAST_UPDATED', new Date().toISOString());

    // optional: append to LocationLog sheet if exists
    try {
      var spreadsheetId = props.getProperty('SPREADSHEET_ID');
      if (!spreadsheetId) {
        Logger.log('Location log skipped: SPREADSHEET_ID script property is missing');
      } else {
        try {
          var ss = SpreadsheetApp.openById(spreadsheetId);
          var locationSheet = ss.getSheetByName('LocationLog');
          if (locationSheet) {
            locationSheet.appendRow([new Date(), lat, lon, distance, status]);
          } else {
            Logger.log('Location log skipped: sheet "LocationLog" not found in spreadsheet ' + spreadsheetId);
          }
        } catch (err2) {
          Logger.log('Location log append failed: ' + err2);
        }
      }
    } catch (err) {
      Logger.log('Location log outer error: ' + err);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: status, distance: distance })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log('doPost error: ' + e);
    return ContentService.createTextOutput(JSON.stringify({ error: String(e) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  // Haversine formula
  function toRad(v) { return (v * Math.PI) / 180; }

  var R = 6371000; // Earth radius in meters
  var φ1 = toRad(lat1);
  var φ2 = toRad(lat2);
  var Δφ = toRad(lat2 - lat1);
  var Δλ = toRad(lon2 - lon1);

  var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

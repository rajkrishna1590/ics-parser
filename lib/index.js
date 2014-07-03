'use strict';

function generateDateFunction(name) {
  return function(value, params, events, lastEvent) {
    var matches = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
    if(matches !== null) {
      lastEvent[name] = new Date(parseInt(matches[1], 10), parseInt(matches[2], 10) - 1, parseInt(matches[3], 10));
      return lastEvent;
    }

    if (/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.test(value)) {
      lastEvent[name] = new Date(value.substring(0, 4) + '-' + value.substring(4, 6) + '-' + value.substring(6, 11) + ':' + value.substring(11, 13) + ':' + value.substring(13));
    }
    return lastEvent;
  };
}

function generateSimpleParamFunction(name) {
  return function(value, params, events, lastEvent) {
    lastEvent[name] = value;
    return lastEvent;
  };
}

var objects = {
  'BEGIN': function(value, params, events, lastEvent) {
    if(value === "CALENDAR") {
      return lastEvent;
    }

    lastEvent.type = value;
    return lastEvent;
  },

  'END': function(value, params, events, lastEvent, data) {
    if(value === "CALENDAR") {
      return lastEvent;
    }

    data.push(lastEvent);

    var index = events.indexOf(lastEvent);
    if(index !== -1) {
      events.splice(events.indexOf(lastEvent), 1);
    }

    lastEvent = {};
    events.push(lastEvent);
  
    return lastEvent;
  },

  'DTSTART': generateDateFunction('start'),
  'DTEND': generateDateFunction('end'),
  'DTSTAMP': generateDateFunction('end'),
  'COMPLETED': generateDateFunction('completed'),

  'UID': generateSimpleParamFunction('uid'),
  'SUMMARY': generateSimpleParamFunction('summary'),
  'DESCRIPTION': generateSimpleParamFunction('description'),
  'LOCATION': generateSimpleParamFunction('location'),
  'URL': generateSimpleParamFunction('url'),

  'ORGANIZER': function(value, params, events, lastEvent) {
    var mail = value.replace('MAILTO:', '');

    if(params.indexOf("CN=") !== -1) {
      lastEvent.organizer = params.replace('CN=', '') + " <" + mail + ">";
    }
    else {
      lastEvent.organizer = mail;
    }
    return lastEvent;
  },

  'GEO': function(value, params, events, lastEvent) {
    var pos = value.split(';');
    if(pos.length !== 2) {
      return lastEvent;
    }

    lastEvent.geo = {};
    lastEvent.geo.latitude = Number(pos[0]);
    lastEvent.geo.longitude = Number(pos[1]);
    return lastEvent;
  },

  'CATEGORIES': function(value, params, events, lastEvent) {
    lastEvent.categories = value.split(/\s*,\s*/g);
    return lastEvent;
  }
};

module.exports = function(str) {
  var data = [];
  
  var events = [];
  var lastEvent = {};

  var lines = str.split('\n');

  events.push(lastEvent);
  for(var i = 0, len = lines.length; i < len; i += 1) {
    var dataLine = lines[i].trim().split(':');
    if(dataLine.length < 2) {
      continue;
    }
    
    var dataName = dataLine[0].split(';');

    var name = dataName[0];
    var params = dataName[1];

    dataLine.splice(0, 1);
    var value = dataLine.join(':');
    if (objects[name]) {
      lastEvent = objects[name](value, (params) ? params : '', events, lastEvent, data);
    }
  }

  console.log(require('util').inspect(events));
  return data;
};
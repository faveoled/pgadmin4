//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import _ from 'lodash';
import gettext from 'sources/gettext';
import { hasTrojanSource } from 'anti-trojan-source';
import convert from 'convert-units';
import getApiInstance from './api_instance';
import usePreferences from '../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';
import { isMac } from './keyboard_shortcuts';

export function parseShortcutValue(obj) {
  let shortcut = '';
  if (!obj){
    return null;
  }
  if (obj.alt) { shortcut += 'alt+'; }
  if (obj.shift) { shortcut += 'shift+'; }
  if (obj.control) { shortcut += 'ctrl+'; }
  shortcut += obj?.key.char?.toLowerCase();
  return shortcut;
}

export function isShortcutValue(obj) {
  if(!obj) return false;
  if([obj.alt, obj.control, obj?.key, obj?.key?.char].every((k)=>!_.isUndefined(k))){
    return true;
  }
  return false;
}

// Convert shortcut obj to codemirror key format
export function toCodeMirrorKey(obj) {
  let shortcut = '';
  if (!obj){
    return shortcut;
  }
  if (obj.alt) { shortcut += 'Alt-'; }
  if (obj.shift) { shortcut += 'Shift-'; }
  if (obj.control) {
    if(isMac() && obj.ctrl_is_meta) {
      shortcut += 'Meta-';
    } else {
      shortcut += 'Ctrl-';
    }
  }
  if(obj?.key.char?.length == 1) {
    shortcut += obj?.key.char?.toLowerCase();
  } else {
    shortcut += obj?.key.char;
  }
  return shortcut;
}

export function getEpoch(inp_date) {
  let date_obj = inp_date ? inp_date : new Date();
  return parseInt(date_obj.getTime()/1000);
}

/* Eucladian GCD */
export function getGCD(inp_arr) {
  let gcd_for_two = (a, b) => {
    return a == 0?b:gcd_for_two(b % a, a);
  };

  let inp_len = inp_arr.length;
  if(inp_len <= 2) {
    return gcd_for_two(inp_arr[0], inp_arr[1]);
  }

  let result = inp_arr[0];
  for(let i=1; i<inp_len; i++) {
    result = gcd_for_two(inp_arr[i], result);
  }

  return result;
}

export function getMod(no, divisor) {
  return ((no % divisor) + divisor) % divisor;
}

export function parseFuncParams(label) {
  let paramArr = [],
    funcName = '',
    paramStr = '';

  if(label.endsWith('()')) {
    funcName = label.substring(0, label.length-2);
  } else if(!label.endsWith(')')) {
    funcName = label;
  } else if(!label.endsWith('()') && label.endsWith(')')) {
    let i = 0,
      startBracketPos = label.length;

    /* Parse through the characters in reverse to find the param start bracket */
    i = label.length-2;
    while(i >= 0) {
      if(label[i] == '(') {
        startBracketPos = i;
        break;
      } else if(label[i] == '"') {
        /* If quotes, skip all the chars till next quote */
        i--;
        while(label[i] != '"') i--;
      }
      i--;
    }

    funcName = label.substring(0, startBracketPos);
    paramStr = label.substring(startBracketPos+1, label.length-1);

    let paramStart = 0,
      paramName = '',
      paramModes = ['IN', 'OUT', 'INOUT', 'VARIADIC'];

    i = 0;
    while(i < paramStr.length) {
      if(paramStr[i] == '"') {
        /* If quotes, skip all the chars till next quote */
        i++;
        while(paramStr[i] != '"') i++;
      } else if (paramStr[i] == ' ') {
        /* if paramName is already set, ignore till comma
         * Or if paramName is parsed as one of the modes, reset.
         */
        if(paramName == '' || paramModes.indexOf(paramName) > -1 ) {
          paramName = paramStr.substring(paramStart, i);
          paramStart = i+1;
        }
      }
      else if (paramStr[i] == ',') {
        paramArr.push([paramName, paramStr.substring(paramStart, i)]);
        paramName = '';
        paramStart = i+1;
      }
      i++;
    }
    paramArr.push([paramName, paramStr.substring(paramStart)]);
  }

  return {
    'func_name': funcName,
    'param_string': paramStr,
    'params': paramArr,
  };
}

export function quote_ident(value) {
  /* check if the string is number or not */
  let quoteIt = false;
  if (!isNaN(parseInt(value))){
    quoteIt = true;
  }

  if(value.search(/[^a-z0-9_]/g) > -1) {
    /* escape double quotes */
    value = value.replace(/"/g, '""');
    quoteIt = true;
  }

  if(quoteIt) {
    return `"${value}"`;
  } else {
    return value;
  }
}

export function fully_qualify(pgBrowser, data, item) {
  const parentData = pgBrowser.tree.getTreeNodeHierarchy(item);
  let namespace = '';

  if (parentData.schema !== undefined) {
    namespace = quote_ident(parentData.schema._label);
  }
  else if (parentData.view !== undefined) {
    namespace = quote_ident(parentData.view._label);
  }
  else if (parentData.catalog !== undefined) {
    namespace = quote_ident(parentData.catalog._label);
  }

  if (parentData.package !== undefined && data._type != 'package') {
    if(namespace == '') {
      namespace = quote_ident(parentData.package._label);
    } else {
      namespace += '.' + quote_ident(parentData.package._label);
    }
  }

  if(namespace != '') {
    return namespace + '.' + quote_ident(data._label);
  } else {
    return quote_ident(data._label);
  }
}

export function getRandomInt(min, max) {
  const intArray = new Uint32Array(1);
  crypto.getRandomValues(intArray);

  let range = max - min + 1;
  return min + (intArray[0] % range);
}

export function titleize(i_str) {
  if(i_str === '' || i_str === null) return i_str;
  return i_str.split(' ')
    .map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
    .join(' ');
}

export function sprintf(i_str) {
  try {
    let replaceArgs = arguments;
    return i_str.split('%s')
      .map(function(w, i) {
        if(i > 0) {
          if(i < replaceArgs.length) {
            return [replaceArgs[i], w].join('');
          } else {
            return ['%s', w].join('');
          }
        } else {
          return w;
        }
      })
      .join('');
  } catch(e) {
    console.error(e);
    return i_str;
  }
}

// Modified ref: http://stackoverflow.com/a/1293163/2343 to suite pgAdmin.
// This will parse a delimited string into an array of arrays.
export function CSVToArray(strData, strDelimiter, quoteChar){
  strDelimiter = strDelimiter || ',';
  quoteChar = quoteChar || '"';

  // Create a regular expression to parse the CSV values.
  let objPattern = new RegExp(
    (
    // Delimiters.
      '(\\' + strDelimiter + '|\\r?\\n|\\r|^)' +
            // Quoted fields.
            (quoteChar == '"' ? '(?:"([^"]*(?:""[^"]*)*)"|' : '(?:\'([^\']*(?:\'\'[^\']*)*)\'|') +
            // Standard fields.
            (quoteChar == '"' ? '([^"\\' + strDelimiter + '\\r\\n]*))': '([^\'\\' + strDelimiter + '\\r\\n]*))')
    ),
    'gi'
  );

  // Create an array to hold our data. Give the array
  // a default empty first row.
  let arrData = [[]];

  // The regex doesn't handle and skips start value if
  // string starts with delimiter
  if(strData.startsWith(strDelimiter)) {
    arrData[ arrData.length - 1 ].push(null);
  }

  // Create an array to hold our individual pattern
  // matching groups.
  let arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while ((arrMatches = objPattern.exec( strData ))){
    // Get the delimiter that was found.
    let strMatchedDelimiter = arrMatches[ 1 ];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter){
      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push( [] );
    }

    let strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[ 2 ]){
      // We found a quoted value. When we capture
      // this value, unescape any quotes.
      strMatchedValue = arrMatches[ 2 ].replace(new RegExp( quoteChar+quoteChar, 'g' ), quoteChar);
    } else {
      // We found a non-quoted value.
      strMatchedValue = arrMatches[ 3 ];
    }
    // Now that we have our value string, let's add
    // it to the data array.
    arrData[ arrData.length - 1 ].push( strMatchedValue );
  }
  // Return the parsed data.
  return arrData;
}

export function hasBinariesConfiguration(pgBrowser, serverInformation) {
  const module = 'paths';
  let preference_name = 'pg_bin_dir';
  let msg = gettext('Please configure the PostgreSQL Binary Path in the Preferences dialog.');

  if ((serverInformation.type && serverInformation.type === 'ppas') ||
    serverInformation.server_type === 'ppas') {
    preference_name = 'ppas_bin_dir';
    msg = gettext('Please configure the EDB Advanced Server Binary Path in the Preferences dialog.');
  }

  const preference = usePreferences.getState().getPreferences(module, preference_name);

  if (preference) {
    if (_.isUndefined(preference.value) || !checkBinaryPathExists(preference.value, serverInformation.version)) {
      pgAdmin.Browser.notifier.alert(gettext('Configuration required'), msg);
      return false;
    }
  } else {
    pgAdmin.Browser.notifier.alert(
      gettext('Preferences Error'),
      gettext('Failed to load preference %s of module %s', preference_name, module)
    );
    return false;
  }
  return true;
}

function checkBinaryPathExists(binaryPathArray, selectedServerVersion) {
  let foundDefaultPath = false,
    serverSpecificPathExist = false,
    binPathArray = JSON.parse(binaryPathArray);

  _.each(binPathArray, function(binPath) {
    if (selectedServerVersion >= binPath.version && selectedServerVersion < binPath.next_major_version) {
      if (!_.isUndefined(binPath.binaryPath) && !_.isNull(binPath.binaryPath) && binPath.binaryPath.trim() !== '')
        serverSpecificPathExist = true;
    }

    // Check for default path
    if (binPath.isDefault) {
      foundDefaultPath = true;
    }
  });

  return (serverSpecificPathExist | foundDefaultPath);
}

/* If a function, then evaluate */
export function evalFunc(obj, func, ...param) {
  if(_.isFunction(func)) {
    return func.apply(obj, [...param]);
  }
  return func;
}

export function getBrowser() {
  let ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if(/trident/i.test(M[1])) {
    tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
    return {name:'IE', version:(tem[1]||'')};
  }
  if(ua.startsWith('Nwjs')) {
    let nwjs = ua.split('-')[0]?.split(':');
    return {name:nwjs[0], version: nwjs[1]};
  }

  if(M[1]==='Chrome') {
    tem=ua.match(/\bOPR|Edge\/(\d+)/);
    if(tem!=null) {return {name:tem[0], version:tem[1]};}
  }

  M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
  if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
  return {
    name: M[0],
    version: M[1],
  };
}

export function checkTrojanSource(content, isPasteEvent) {
  // Call the hasTrojanSource function of 'anti-trojan-source' package
  if (hasTrojanSource({ sourceText: content})) {
    let msg = gettext('The file opened contains bidirectional Unicode characters which could be interpreted differently than what is displayed. If this is unexpected it is recommended that you review the text in an application that can display hidden Unicode characters before proceeding.');
    if (isPasteEvent) {
      msg = gettext('The pasted text contains bidirectional Unicode characters which could be interpreted differently than what is displayed. If this is unexpected it is recommended that you review the text in an application that can display hidden Unicode characters before proceeding.');
    }
    pgAdmin.Browser.notifier.alert(gettext('Trojan Source Warning'), msg);
  }
}

export function downloadBlob(blob, fileName) {
  let urlCreator = window.URL || window.webkitURL,
    downloadUrl = urlCreator.createObjectURL(blob),
    link = document.createElement('a');

  document.body.appendChild(link);

  if (getBrowser() == 'IE' && window.navigator.msSaveBlob) {
  // IE10+ : (has Blob, but not a[download] or URL)
    window.navigator.msSaveBlob(blob, fileName);
  } else {
    link.setAttribute('href', downloadUrl);
    link.setAttribute('download', fileName);
    link.click();
  }
  document.body.removeChild(link);
}

export function toPrettySize(rawSize, from='B') {
  try {
    //if the integer need to be converted to K for thousands, M for millions , B for billions only
    if (from == '') {
      return Intl.NumberFormat('en', {notation: 'compact'}).format(rawSize);
    }
    let conVal = convert(rawSize).from(from).toBest();
    conVal.val = Math.round(conVal.val * 100) / 100;
    return `${conVal.val} ${conVal.unit}`;
  }
  catch {
    return '';
  }
}

export function compareSizeVals(val1, val2) {
  const parseAndConvert = (val)=>{
    try {
      let [size, unit] = val.split(' ');
      return convert(size).from(unit.toUpperCase()).to('B');
    } catch {
      return -1;
    }
  };
  val1 = parseAndConvert(val1);
  val2 = parseAndConvert(val2);
  if(val1 > val2) return 1;
  return (val1 < val2 ? -1 : 0);
}

export function calcFontSize(fontSize) {
  if(fontSize) {
    fontSize = parseFloat((Math.round(parseFloat(fontSize + 'e+2')) + 'e-2'));
    let rounded = Number(fontSize);
    if(rounded > 0) {
      return rounded + 'em';
    }
  }
  return '1em';
}

export function pgHandleItemError(error, args) {
  let pgBrowser = window.pgAdmin.Browser;

  if (!error || !pgBrowser) {
    return;
  }

  if(error.response.headers['content-type'] == 'application/json') {
    let jsonResp = error.response.data;
    if (
      jsonResp && (
        error.response.status == 503 ? (
          jsonResp.info == 'CONNECTION_LOST' &&
          'server' in args.info && jsonResp.data.sid >= 0 &&
          jsonResp.data.sid == args.info.server._id
        ) : (
          error.response.status == 428 &&
          jsonResp.errormsg &&
          jsonResp.errormsg == gettext('Connection to the server has been lost.')
        )
      )
    ) {
      if (
        args.preHandleConnectionLost &&
        typeof(args.preHandleConnectionLost) == 'function'
      ) {
        args.preHandleConnectionLost.apply(this, arguments);
      }

      // Check the status of the maintenance server connection.
      let server = pgBrowser.Nodes['server'],
        ctx = {
          resp: jsonResp,
          error: error,
          args: args,
        },
        reconnectServer = function() {
          let ctx_local = this,
            onServerConnect = function(_sid, _i, _d) {
              // Yay - server is reconnected.
              if (this.args.info.server._id == _sid) {
                pgBrowser.Events.off(
                  'pgadmin:server:connected', onServerConnect
                );
                pgBrowser.Events.off(
                  'pgadmin:server:connect:cancelled', onConnectCancel
                );

                // Do we need to connect the disconnected server now?
                if (
                  this.resp.data.database &&
                  this.resp.data.database != _d.db
                ) {
                  // Server is connected now, we will need to inform the
                  // database to connect it now.
                  pgBrowser.Events.trigger(
                    'pgadmin:database:connection:lost', this.args.item,
                    this.resp, true
                  );
                }
              }
            }.bind(ctx_local),
            onConnectCancel = function(_sid, _item, _data) {
              // User has cancelled the operation in between.
              if (_sid == this.args.info.server.id) {
                pgBrowser.Events.off('pgadmin:server:connected', onServerConnect);
                pgBrowser.Events.off('pgadmin:server:connect:cancelled', onConnectCancel);

                // Connection to the database will also be cancelled
                pgBrowser.Events.trigger(
                  'pgadmin:database:connect:cancelled', _sid,
                  this.resp.data.database || _data.db, _item, _data
                );
              }
            }.bind(ctx_local);

          pgBrowser.Events.on('pgadmin:server:connected', onServerConnect);
          pgBrowser.Events.on('pgadmin:server:connect:cancelled', onConnectCancel);

          // Connection to the server has been lost, we need to inform the
          // server first to take the action first.
          pgBrowser.Events.trigger(
            'pgadmin:server:connection:lost', this.args.item, this.resp
          );
        }.bind(ctx);

      getApiInstance().get(server.generate_url(
        null, 'connect', args.info.server, true, args.info
      ))
        .then(({data: res})=>{
          if (res.success && 'connected' in res.data) {
            if (res.data.connected) {
              // Server is connected, but - the connection with the
              // particular database has been lost.
              pgBrowser.Events.trigger(
                'pgadmin:database:connection:lost', args.item, jsonResp
              );
              return;
            }
          }

          // Server was not connected, we should first try to connect
          // the server.
          reconnectServer();
        })
        .catch(()=>{
          reconnectServer();
        });
      return true;
    } else if (jsonResp && jsonResp.info == 'CRYPTKEY_MISSING' && error.response.status == 503) {
      /* Suppress the error here and handle in pgNotifier wherever
       * required, as it has callback option
       */
      return false;
    }
  }

  return false;
}

export function fullHexColor(shortHex) {
  if(shortHex?.length == 4) {
    return shortHex.replace(RegExp('#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])'), '#$1$1$2$2$3$3').toUpperCase();
  }
  return shortHex;
}

export function gettextForTranslation(translations, ...replaceArgs) {
  const text = replaceArgs[0];
  let rawTranslation = translations[text] ? translations[text] : text;

  if(arguments.length == 2) {
    return rawTranslation;
  }

  try {
    return rawTranslation.split('%s')
      .map(function(w, i) {
        if(i > 0) {
          if(i < replaceArgs.length) {
            return [replaceArgs[i], w].join('');
          } else {
            return ['%s', w].join('');
          }
        } else {
          return w;
        }
      })
      .join('');
  } catch(e) {
    console.error(e);
    return rawTranslation;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelAnimationFrame
const requestAnimationFrame =
  window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame;

const cancelAnimationFrame =
  window.cancelAnimationFrame || window.mozCancelAnimationFrame;

/* Usefull in focussing an element after it appears on the screen */
export function requestAnimationAndFocus(ele) {
  if(!ele) return;

  const animateId = requestAnimationFrame(()=>{
    ele?.focus?.();
    cancelAnimationFrame(animateId);
  });
}


export function scrollbarWidth() {
  // thanks too https://davidwalsh.name/detect-scrollbar-width
  const scrollDiv = document.createElement('div');
  scrollDiv.setAttribute('style', 'width: 100px; height: 100px; overflow: scroll; position:absolute; top:-9999px;');
  document.body.appendChild(scrollDiv);
  const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document.body.removeChild(scrollDiv);
  return scrollbarWidth;
}
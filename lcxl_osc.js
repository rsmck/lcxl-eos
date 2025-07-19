/*
 * LaunchControlXL for ETCnomad 
 *
 * This is UNSUPPORTED and probably not ideal for production use 
 * yet, and will eventually be packaged into a proper app but for
 * those that want it, this gets the LaunchControl XL working as 
 * a simple controller for ETCnomad.
 *
 * I also intend to completely rewrite this in a more structured 
 * way, this is very much just my initial attempt to prove it works!
 *
 * Requires a little understanding of nodejs, then just run this 
 * from the command line (or under pm2 for added resilience)
 *
 * Ross Henderson - ross@rmlx.co.uk
 *
 */

// Require
const midi = require('midi');
const oscjs = require("osc");
const util = require ("util");

// MIDI Interface
let input = new midi.Input();
let output = new midi.Output();
let midiConnected = false;
let midiReconnectInterval = 3000;

// EOS
const EOS_CONSOLE_IP = "127.0.0.1";
const EOS_PROTO = 'tcp';
const EOS_CONSOLE_PORT = 5604;

// config
const DEBUG = false;
const FADER_MISMATCH_CATCH = true;
const FADER_MANTIME_FLASH = true; 

// State
var strLastCueState = '';
var bolShiftPressed = false;
var bolReady = false;
var bolDeskLocked = false;
var intLastAct = 0;
var strLastAct = '';
var bolFadeFlash = 0;
var manTimeFlashInterval = null;
var manTime = 0;
var manTimeFlashState = 0;

// Definitions 
var faderLevels = new Array(9);
var faderLevelsLocal = new Array(9);
var ctl = new Array(128);
var fc = new Array(9);

// New Global Config
ctl[13] = {'mode': 'encoder', 'act': 'frame_angle_a', 'col': 45, 'unit': 'º'};
ctl[14] = {'mode': 'encoder', 'act': 'frame_angle_b', 'col': 45, 'unit': 'º'};
ctl[15] = {'mode': 'encoder', 'act': 'frame_angle_c', 'col': 45, 'unit': 'º'};
ctl[16] = {'mode': 'encoder', 'act': 'frame_angle_d', 'col': 45, 'unit': 'º'};
ctl[17] = {'mode': 'encoder', 'act': 'iris', 'col': 53};
ctl[18] = {'mode': 'encoder', 'act': 'edge', 'col': 53};
ctl[19] = {'mode': 'encoder', 'act': 'zoom', 'col': 53, 'unit': 'º'};
ctl[20] = {'mode': 'encoder', 'act': 'intens', 'col': 3};
ctl[21] = {'mode': 'encoder', 'act': 'frame_thrust_a', 'col': 41};
ctl[22] = {'mode': 'encoder', 'act': 'frame_thrust_b', 'col': 41};
ctl[23] = {'mode': 'encoder', 'act': 'frame_thrust_c', 'col': 41};
ctl[24] = {'mode': 'encoder', 'act': 'frame_thrust_d', 'col': 41};
ctl[25] = {'mode': 'encoder', 'act': 'frame_assembly', 'col': 45, 'unit': 'º'};
ctl[26] = {'mode': 'inop'};
ctl[27] = {'mode': 'encoder', 'act': 'pan', 'col': 21, 'unit': 'º'};
ctl[28] = {'mode': 'encoder', 'act': 'tilt', 'col': 21, 'unit': 'º'};
ctl[29] = {'mode': 'encoder', 'act': 'red', 'col': 5};
ctl[30] = {'mode': 'encoder', 'act': 'amber', 'col': 9};
ctl[31] = {'mode': 'encoder', 'act': ['mint','lime'], 'col': 17};
ctl[32] = {'mode': 'encoder', 'act': 'green', 'col': 22};
ctl[33] = {'mode': 'encoder', 'act': 'blue', 'col': 67};
ctl[34] = {'mode': 'encoder', 'act': 'cyan', 'col': 37};
ctl[35] = {'mode': 'encoder', 'act': 'magenta', 'col': 53};
ctl[36] = {'mode': 'encoder', 'act': 'yellow', 'col': 13};
ctl[116] = {'mode': 'key', 'act': 'go_0', 'col': 23};
ctl[118] = {'mode': 'key', 'act': 'stop', 'col': 121};
ctl[103] = {'mode': 'key', 'act': 'prev', 'col': 9};
ctl[102] = {'mode': 'key', 'act': 'next', 'col': 9};
ctl[104] = {'mode': 'key', 'act': 'select_last', 'col': 9};

// Fader Colours
faderTypes = [
  { 'match': /^S /, 'col_off': 10, 'col_on': 9, 'top_col': 9, 'factor': 1, 'unit': '%' }, 
  { 'match': /^L[0-9]+  /, 'col_off': 23, 'col_on': 23, 'top_col': 121, 'factor': 1, 'unit': '%' }, 
  { 'match': /^IP /, 'col_off': 9, 'col_on': 9, 'top_col': 9, 'factor': 1, 'unit': '%' }, 
  { 'match': /^FP /, 'col_off': 123, 'col_on': 26, 'top_col': 9, 'factor': 1, 'unit': '%' },  // dk green
  { 'match': /^BP /, 'col_off': 67, 'col_on': 66, 'top_col': 9, 'factor': 1, 'unit': '%'},  // dk blue
  { 'match': /^Pr /, 'col_off': 68, 'col_on': 68, 'top_col': 9, 'factor': 1, 'unit': '%' },  //  teal
  { 'match': /Inhib/, 'col_off': 121, 'col_on': 5, 'top_col': 9, 'factor': 1, 'unit': '%' }, 
  { 'match': 'Man Time', 'col_off': 67, 'col_on': 45, 'top_col': 9, 'factor': 0.001, 'unit': 's' }, 
  { 'match': 'Cue RM', 'col_off': 67, 'col_on': 45, 'top_col': 9, 'factor': 1, 'unit': '' }, 
  { 'match': 'Global FX', 'col_off': 51, 'col_on': 69, 'top_col': 9, 'factor': 1, 'unit': '' }, // purple
  { 'match': 'GM', 'col_off': 121, 'col_on': 5, 'top_col': 121, 'top_col_on': 5, 'factor': 1, 'unit': '%' }, 
]

// Default Fader Config
for (var i = 0; i < fc.length; i++) { 
  fc[i] = {'label': '', 'range': [0,100], 'factor': 1, 'unit': '%'};
}

// Initiallise
osc = connectEos();
connectMIDI();

function connectEos() {
  if (EOS_PROTO == 'tcp') {
    var osc = new oscjs.TCPSocketPort({ localAddress: EOS_CONSOLE_IP, localPort: EOS_CONSOLE_PORT, metadata: true });
    osc.open(EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else {
    var osc = new oscjs.UDPPort({ localAddress: EOS_CONSOLE_IP, localPort: EOS_CONSOLE_PORT, metadata: true });
    osc.open();
  }
  if (osc) {
    // Setup Eos Session + Faders
    osc.on("message", oscHandler);
    osc.send({ address: '/eos/fader/1/config/8' }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    osc.send({ address: '/eos/subscribe', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    osc.send({ address: '/eos/subscribe/fader', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    osc.send({ address: '/eos/subscribe/out/fader', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    osc.send({ address: '/eos/subscribe/wheel', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    osc.send({ address: '/eos/subscribe/param', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    return osc;
  }
  return false;
}

function connectMIDI() {
  try {
    // Set up a new input.
    input.ignoreTypes(false, false, false);

    var inputId = 0;
    var outputId = 0;

    // Count the available MIDI ports.
    const portCount = input.getPortCount();

    if (portCount === 0) {
      console.log('No MIDI devices found.');
      process.exit(1);
    }

    // Print available ports
    console.log('Available MIDI input ports:');
    for (let i = 0; i < portCount; i++) {
      if (input.getPortName(i) == 'LCXL3 1 DAW Out' && inputId == 0) { 
        inputId = i; 
        console.log(`${i}: ${input.getPortName(i)} ** SELECTED **`);
      } else {
        console.log(`${i}: ${input.getPortName(i)}`);
      }
    }
    for (let i = 0; i < portCount; i++) {
      if (output.getPortName(i) == 'LCXL3 1 DAW In' && outputId == 0) { 
        outputId = i; 
        console.log(`${i}: ${output.getPortName(i)} ** SELECTED **`);
      } else {
        console.log(`${i}: ${output.getPortName(i)}`);
      }
    }

    if (outputId === 0 && inputId === 0) {
      console.log('No LaunchControl XL device found.');
      process.exit(1);
    }

    // Connect to LCXL
    input.openPort(inputId);
    output.openPort(outputId);

    if (input) {
      midiConnected = true;

      // Configure the LCXL
      MIDItx([240,0,32,41,2,21,2,127,247]);
      // Enable Relative Mode on Encoders
      MIDItx([182,69,127]);
      MIDItx([182,72,127]);
      MIDItx([182,73,127]);
      MIDItx([182,71,127]);

      // disable all display autopops
      const controlTargets = [...Array(32)].map((_, i) => i + 0x05); // 0x05 to 0x24
      for (let target of controlTargets) {
        MIDItx([240, 0, 32, 41, 2, 21, 4, target, 0x04, 247]);
      }

      // Initial Colours
      for (let control = 1; control < 164; control++) {
        if (typeof ctl[control] == 'object' && ctl[control].col > 0) {
          MIDItx([176,control,ctl[control].col]);
        }
      }

      input.on('message', MIDIhandler);
  
      return true;
    }
  } catch (err) {
    console.error('Error during MIDI connection:', err);
    midiConnected = false;
    return false;
  }
}

function encoderPop(a,b,c) {
  if (typeof a == 'undefined') a = '';
  if (typeof b == 'undefined') b = '';
  if (typeof c == 'undefined') c = '';
  MIDItx([240, 0, 32, 41, 2, 21, 4, 54, 0x01, 247])
  MIDItx([ 240, 0, 32, 41, 2, 21, 6, 54, 0, ...a.split('').map(c=>c.charCodeAt(0)), 247] );
  MIDItx([ 240, 0, 32, 41, 2, 21, 6, 54, 1, ...b.split('').map(c=>c.charCodeAt(0)), 247] );
  MIDItx([ 240, 0, 32, 41, 2, 21, 4, 54, 0x7F, 247 ]);
}

function displayMain(a,b,c) {
  if (typeof a == 'undefined') a = '';
  if (typeof b == 'undefined') b = '';
  if (typeof c == 'undefined') c = '';
  MIDItx([240, 0, 32, 41, 2, 21, 4, 53, 0x02, 247])
  MIDItx([ 240, 0, 32, 41, 2, 21, 6, 53, 0, ...a.split('').map(c=>c.charCodeAt(0)), 247] );
  MIDItx([ 240, 0, 32, 41, 2, 21, 6, 53, 1, ...b.split('').map(c=>c.charCodeAt(0)), 247] );
  MIDItx([ 240, 0, 32, 41, 2, 21, 6, 53, 2, ...c.split('').map(c=>c.charCodeAt(0)), 247] );
  MIDItx([ 240, 0, 32, 41, 2, 21, 4, 53, 0x7F, 247 ]);
}


// Update Fader LEDs
function updateFaders() {
  bolManTimeSeen = false;
  for (let i = 1; i < fc.length; i++) {
    topBtn = i+36;
    btmBtn = i+44;

    var faderDefinition = {col_off: 0, col_on: 0, top_col: 0, top_col_on: 0};

    if (fc[i].label != '') {
      for (const item of faderTypes) {
        const isMatch = (item.match instanceof RegExp)
          ? item.match.test(fc[i].label)
          : fc[i].label === item.match;

        if (isMatch) {
          faderDefinition = item;
        }
      }

      fc[i].unit = faderDefinition.unit;
      fc[i].factor = faderDefinition.factor;

      if (faderDefinition.top_col_on === undefined) faderDefinition.top_col_on = faderDefinition.top_col;
      if (faderDefinition.col_on === undefined) faderDefinition.col_on = faderDefinition.col_off;

      if (FADER_MANTIME_FLASH && fc[i].label == 'Man Time' && manTimeFlashInterval != null) {
        bolManTimeSeen = true;
        continue;
      }

      if (faderLevels[i] > 0) {
          MIDItx([176,topBtn,faderDefinition.top_col_on]);
          MIDItx([176,btmBtn,faderDefinition.col_on]);
      } else {
          MIDItx([176,topBtn,faderDefinition.top_col]);
          MIDItx([176,btmBtn,faderDefinition.col_off]);
      }

      if ((faderLevels[i] != faderLevelsLocal[i]) && bolFadeFlash == 1) {
          if (fc[i].label == 'GM') MIDItx([176,topBtn,0]);
          MIDItx([176,btmBtn,0]);
      }
    } else {
      // undefined fader
      MIDItx([176,topBtn,0]);
      MIDItx([176,btmBtn,0]);
    }
  }

  if (FADER_MANTIME_FLASH && manTimeFlashInterval && !bolManTimeSeen) {
    clearInterval(manTimeFlashInterval);
    manTimeFlashInterval = null;
  }

  if (bolFadeFlash == 1) {
    bolFadeFlash = 0;
  } else {
    bolFadeFlash = 1;
  }
}

// Main Handler
function MIDIhandler(deltaTime,message) {
  const z = message[0];
  const ch = message[1];
  const val = message[2];
  const now = Date.now();

  if (z == 190) {
    // touch event, discard this for now
  } else if (bolDeskLocked) {
    // literally no point in sending anything to a locked console!
    return;
  } else if (ch == 63) {
    // shift
    if (val == 127) {
      bolShiftPressed = true;
    } else {
      bolShiftPressed = false;
    }
  } if (z == 191 && (ch >= 77 && ch <= 100)) {
    // wheel 
    dir = val-64;
    id = ch-64;

    if (typeof ctl[id].act == 'object') {
      // we're going to trigger more than one wheel on the console (lime/mint are the same!)
      for (let i = 0; i < ctl[id].act.length; i++) {
        strWheelMsg = '/eos/wheel/'+ctl[id].act[i];
        osc.send({
            address: strWheelMsg,
            args: [{type: "f", value: dir}]
        }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
      }
      strLastAct = ctl[id].act.join('|').replace(/[^0-9a-z\|]/gi, '');
    } else if (typeof ctl[id].act == 'string') {
      strWheelMsg = '/eos/wheel/'+ctl[id].act;
      strLastAct = ctl[id].act.replace(/[^0-9a-z]/gi, '');
      osc.send({
          address: strWheelMsg,
          args: [{type: "f", value: dir}]
      }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    } else {
      console.log(typeof ctl[id].act);
    }
    intLastAct = now;
  } else if (z == 191 && (ch >= 5 && ch <= 12)) {
    // fader

    const faderId = ch-4;
    const faderMult = val/127;
    const faderRange = fc[faderId].range[1]-fc[faderId].range[0];

    if (fc[faderId].label == '') return;

    const strFaderMsg = '/eos/fader/1/'+faderId;
    faderLevelsLocal[faderId] = (val/127).toFixed(2);

    if (FADER_MISMATCH_CATCH && now > intLastAct+400 && !bolShiftPressed) {
      if (Math.abs(faderLevelsLocal[faderId]-faderLevels[faderId]) > 0.03) {
        // display value 
        var displayValueLocked = (faderLevels[faderId]*fc[faderId].range[1]*fc[faderId].factor).toFixed(2)+' '+fc[faderId].unit;
        if (faderLevelsLocal[faderId] > faderLevels[faderId]) {
          encoderPop(fc[faderId].label, 'v  ( '+displayValueLocked+' )  v');
        } else {
          encoderPop(fc[faderId].label, '^  ( '+displayValueLocked+' )  ^');
        }
        return;
      }
    }

    // manual time fader? 
    if (FADER_MANTIME_FLASH && fc[faderId].label == 'Man Time') {
        intTimeMsec = fc[faderId].range[0]+faderMult*faderRange;
        if (intTimeMsec == 0) {
          // not flashing
          clearInterval(manTimeFlashInterval);
          manTimeFlashInterval = null;
        } else {
          clearInterval(manTimeFlashInterval);
          manTimeFlashInterval = null;
          manTimeFlashInterval = setInterval(() => {
              MIDItx([176,ch+32,0]);
              setTimeout(() => {
                MIDItx([176,ch+32,67]);
              }, 500)
          }, intTimeMsec );
        }
    }

    displayValue = ((fc[faderId].range[0]+faderMult*faderRange)*fc[faderId].factor).toFixed(2)+' '+fc[faderId].unit;
    encoderPop(fc[faderId].label, displayValue);

    faderLevels[faderId] = (val/127).toFixed(2);

    osc.send({
        address: strFaderMsg,
        args: [{type: "f", value: val/127}]
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    intLastAct = now;
  } else if (ch >= 37 && ch <= 52) {
    // Fader Buttons
    var strFaderMsg = '';

    var act = 0;
    if (val > 1) { act = 1; }

    if (ch >= 45) {
      strFaderMsg = '/eos/fader/1/'+(ch-44)+'/fire';
    } else {
      strFaderMsg = '/eos/fader/1/'+(ch-36)+'/stop';
    }

    osc.send({
        address: strFaderMsg,
        args: [{type: "f", value: act}]
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else if (typeof ctl[ch] == 'object') {
    // we have a definition for this 
    switch (ctl[ch].mode) {
      case 'key':
        if (val == 127) {
          osc.send({
              address: '/eos/key/'+ctl[ch].act,
          }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
        }
        break;
      default:
        break;
    }
  } else {
    if (DEBUG) console.log(`Received UNKNOWN MIDI message: [${message.join(', ')}] (deltaTime: ${deltaTime})`);
  }
}

// handle inbound messages and display them


function oscHandler(oscMsg) {
  if (oscMsg.address == '/eos/out/active/cue/text') {
    const parts = oscMsg.args[0].value.split(' ');
    if (oscMsg.args[0].value != strLastCueState) {
      displayMain('LXQ: '+parts[0], parts[1], parts[2]);
    }
    strLastCueState = oscMsg.args[0].value;
  } else if (bolReady && oscMsg.address.match(/\/active\/wheel/i)) {
    var now = Date.now();
    if (now > intLastAct+300) return;
    const parts = oscMsg.args[0].value.match(/(.*)\[/);
    const label = parts[1].trim();
    const value = oscMsg.args[2].value.toFixed(2)+'';
    // filter out messages that aren't for the value we're actively changing
    if (!label.replace(/[^a-z]/gi, '').toLowerCase().trim().match(strLastAct)) {
      return;
    }
    encoderPop(label,value,'');
  } else if (bolReady && oscMsg.address.match(/\/eos\/fader\/1/i)) {
    var now = Date.now();
    // if (now > intLastAct+900) return;
    const parts = oscMsg.address.match(/\/eos\/fader\/1\/([0-9])/);
    const faderId = parts[1];
    const value = oscMsg.args[0].value.toFixed(2);
    faderLevels[faderId] = value;
  } else if (oscMsg.address.match(/\/eos\/out\/fader\/1\/([0-9])\/name/i)) {
    const parts = oscMsg.address.match(/\/eos\/out\/fader\/1\/([0-9])/);
    const faderId = parts[1];
    const value = oscMsg.args[0].value;
    fc[faderId].label = value;
  } else if (oscMsg.address.match(/\/eos\/out\/fader\/range\/1\/([0-9])/i)) {
    const parts = oscMsg.address.match(/\/eos\/out\/fader\/range\/1\/([0-9])/);
    const faderId = parts[1];
    const min = oscMsg.args[0].value;
    const max = oscMsg.args[1].value;
    fc[faderId].range = [min,max];
  } else if (oscMsg.address == '/eos/out/event/locked') {
    const parts = strLastCueState.split(' '); 
    if (oscMsg.args[0].value == 1) {
      bolDeskLocked = true;
      displayMain('LXQ: '+parts[0],'* LOCKED *','** OUT **');
    } else {
      bolDeskLocked = false;
      displayMain('LXQ: '+parts[0], parts[1], parts[2]);
    }
  }
}

function MIDIcheck() {
  if (!midiConnected) {
    console.log('Attempting MIDI reconnection...');
    try {
      input.closePort(); 
      output.closePort();
    } catch (e) { /* Ignore */ }

    try {
      input = new midi.Input();
      output = new midi.Output();
    } catch (e) {
      console.error('Failed to create new MIDI session:', e);
      return;
    }

    const success = connectMIDI();
    if (!success) {
      midiConnected = false;
    }
  }
}

function MIDItx(message) {
  try {
    if (midiConnected) output.sendMessage(message);
  } catch (e) {
    console.error('MIDI error:', e);
    midiConnected = false;
  }
}

setTimeout(function() { bolReady = true; }, 2000);
setInterval(updateFaders, 400);
setInterval(MIDIcheck, midiReconnectInterval);

console.log('Running');

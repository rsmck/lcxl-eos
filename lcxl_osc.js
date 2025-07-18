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

// EOS
const EOS_CONSOLE_IP = "127.0.0.1";
const EOS_PROTO = 'tcp';
const EOS_CONSOLE_PORT = 5604;
const DEBUG = false;

// State
var strLastCueState = '';
var bolShiftPressed = false;
var bolReady = false;
var bolDeskLocked = false;


// Definitions 
var wheelNames = new Array(128);
var controlColours = new Array(128);

// What do the encoders do
wheelNames[13] = 'frame_angle_a';
wheelNames[14] = 'frame_angle_b';
wheelNames[15] = 'frame_angle_c';
wheelNames[16] = 'frame_angle_d';
wheelNames[17] = 'iris';
wheelNames[18] = 'edge';
wheelNames[19] = 'zoom';
wheelNames[20] = 'level';

wheelNames[21] = 'frame_thrust_a';
wheelNames[22] = 'frame_thrust_b';
wheelNames[23] = 'frame_thrust_c';
wheelNames[24] = 'frame_thrust_d';
wheelNames[25] = 'frame_assembly';
wheelNames[26] = '';
wheelNames[27] = 'pan';
wheelNames[28] = 'tilt';

wheelNames[29] = 'red';
wheelNames[30] = 'amber' ;
wheelNames[31] = Array('mint','lime');
wheelNames[32] = 'green';
wheelNames[33] = 'blue';
wheelNames[34] = 'cyan';
wheelNames[35] = 'magenta';
wheelNames[36] = 'yellow';

// initial colour mapping (fixme: use RGB later!)
controlColours[13] = 45; // blue
controlColours[14] = 45;
controlColours[15] = 45;
controlColours[16] = 45;
controlColours[17] = 53; // purple
controlColours[18] = 53;
controlColours[19] = 53;
controlColours[20] = 3; // white

controlColours[21] = 41; // light blue
controlColours[22] = 41; 
controlColours[23] = 41; 
controlColours[24] = 41; 
controlColours[25] = 45;
controlColours[26] = '';
controlColours[27] = 21; // green
controlColours[28] = 21;

controlColours[29] = 5; // red
controlColours[30] = 9; // amber
controlColours[31] = 17; // lime
controlColours[32] = 22; // green
controlColours[33] = 67; // blue
controlColours[34] = 37; // cyan
controlColours[35] = 53; // magents
controlColours[36] = 13; // yellow

// fader buttons
controlColours[37] = 9;
controlColours[38] = 9;
controlColours[39] = 9;
controlColours[40] = 9;
controlColours[41] = 9;
controlColours[42] = 9;
controlColours[43] = 9;
controlColours[44] = 9;

controlColours[45] = 22;
controlColours[46] = 22;
controlColours[47] = 22;
controlColours[48] = 22;
controlColours[49] = 22;
controlColours[50] = 22;
controlColours[51] = 22;
controlColours[52] = 22;

controlColours[103] = 9;
controlColours[102] = 9;

// back and go
controlColours[118] = 5;
controlColours[116] = 23;

// OSC Connection to EOS
if (EOS_PROTO == 'tcp') {
  var osc = new oscjs.TCPSocketPort({
      localAddress: EOS_CONSOLE_IP,
      localPort: EOS_CONSOLE_PORT,
      metadata: true
  });
  osc.open(EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
} else {
  var osc = new oscjs.UDPPort({
      localAddress: EOS_CONSOLE_IP,
      localPort: EOS_CONSOLE_PORT,
      metadata: true
  });
  osc.open();
}

// Set up a new input.
const input = new midi.Input();
const output = new midi.Output();
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

// Setup Eos Session + Faders
osc.send({ address: '/eos/fader/1/config/8' }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
osc.send({ address: '/eos/subscribe', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
osc.send({ address: '/eos/subscribe/wheel', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
osc.send({ address: '/eos/subscribe/param', args: [{type: "f", value: 1}] }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);

// Configure the LCXL
output.sendMessage([240,0,32,41,2,21,2,127,247]);
// Enable Relative Mode on Encoders
output.sendMessage([182,69,127]);
output.sendMessage([182,72,127]);
output.sendMessage([182,73,127]);
output.sendMessage([182,71,127]);

// disable all display autopops
const controlTargets = [...Array(32)].map((_, i) => i + 0x05); // 0x05 to 0x24
for (let target of controlTargets) {
  output.sendMessage([240, 0, 32, 41, 2, 21, 4, target, 0x04, 247]);
}

function encoderPop(a,b,c) {
  output.sendMessage([240, 0, 32, 41, 2, 21, 4, 54, 0x01, 247])
  output.sendMessage([ 240, 0, 32, 41, 2, 21, 6, 54, 0, ...a.split('').map(c=>c.charCodeAt(0)), 247] );
  output.sendMessage([ 240, 0, 32, 41, 2, 21, 6, 54, 1, ...b.split('').map(c=>c.charCodeAt(0)), 247] );
//  output.sendMessage([ 240, 0, 32, 41, 2, 21, 6, 54, 2, ...c.split('').map(c=>c.charCodeAt(0)), 247] );
  output.sendMessage([ 240, 0, 32, 41, 2, 21, 4, 54, 0x7F, 247 ]);
}

function displayMain(a,b,c) {
  output.sendMessage([240, 0, 32, 41, 2, 21, 4, 53, 0x02, 247])
  output.sendMessage([ 240, 0, 32, 41, 2, 21, 6, 53, 0, ...a.split('').map(c=>c.charCodeAt(0)), 247] );
  output.sendMessage([ 240, 0, 32, 41, 2, 21, 6, 53, 1, ...b.split('').map(c=>c.charCodeAt(0)), 247] );
  output.sendMessage([ 240, 0, 32, 41, 2, 21, 6, 53, 2, ...c.split('').map(c=>c.charCodeAt(0)), 247] );
  output.sendMessage([ 240, 0, 32, 41, 2, 21, 4, 53, 0x7F, 247 ]);
}

// Initial Colours
for (let control = 1; control < 164; control++) {
  if (controlColours[control] > 0) {
    output.sendMessage([176,control,controlColours[control]]);
  }
}

// Main Handler
input.on('message', (deltaTime, message) => {
  const z = message[0];
  const ch = message[1];
  const val = message[2];

  // Faders
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
  } else if (ch == 104 && val == 127) {
    // weird hidden button
    osc.send({
        address: '/eos/key/last',
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else if (ch == 103 && val == 127) {
    // prev
    osc.send({
        address: '/eos/key/last',
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else if (ch == 102 && val == 127) {
    // next
    osc.send({
        address: '/eos/key/next',
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else if (ch == 116 && val == 127) {
    // go 
    osc.send({
        address: '/eos/key/go_0',
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else if (ch == 118 && val == 127) {
    // stop back 
    osc.send({
        address: '/eos/key/stop',
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else if (z == 191 && (ch >= 5 && ch <= 12)) {
    const strFaderMsg = '/eos/fader/1/'+(ch-4);
    encoderPop('Fader '+(ch-4),(val/127*100).toFixed(2)+'%',' ');
    osc.send({
        address: strFaderMsg,
        args: [{type: "f", value: val/127}]
    }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
  } else if (ch >= 37 && ch <= 52) {
    // buttons
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
  } else if (ch >= 77 && ch <= 100) {
    // this is a wheel (64 is the midpoint)
    dir = val-64;

    // shift for speedup
    if (bolShiftPressed) { dir = dir*3; }

    if (typeof wheelNames[ch-64] == 'array' || typeof wheelNames[ch-64] == 'object') {
      // we're going to trigger more than one wheel on the console (lime/mint are the same!)
      for (let i = 0; i < wheelNames[ch-64].length; i++) {
        strWheelMsg = '/eos/wheel/'+wheelNames[ch-64][i];
        osc.send({
            address: strWheelMsg,
            args: [{type: "f", value: dir}]
        }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
      }
    } else {
      strWheelMsg = '/eos/wheel/'+wheelNames[ch-64];
      osc.send({
          address: strWheelMsg,
          args: [{type: "f", value: dir}]
      }, EOS_CONSOLE_IP, EOS_CONSOLE_PORT);
    }
  } else {
    if (DEBUG) console.log(`Received UNKNOWN MIDI message: [${message.join(', ')}] (deltaTime: ${deltaTime})`);
  }

  if (DEBUG) {console.log(`Received MIDI message: [${message.join(', ')}] (deltaTime: ${deltaTime})`);}
});

// handle inbound messages and display them
osc.on("message", function (oscMsg) {
  if (oscMsg.address == '/eos/out/active/cue/text') {
    const parts = oscMsg.args[0].value.split(' ');
    if (oscMsg.args[0].value != strLastCueState) {
      displayMain('LXQ: '+parts[0], parts[1], parts[2]);
    }
    strLastCueState = oscMsg.args[0].value;
  } else if (bolReady && oscMsg.address.match(/\/active\/wheel/i)) {
    const parts = oscMsg.args[0].value.match(/(.*)\[/);
    const label = parts[1].trim();
    const value = oscMsg.args[2].value.toFixed(2)+'';
    encoderPop(label,value,'');
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
});

setTimeout(function() { bolReady = true; }, 2000);

console.log('Running');

# Novation LaunchControl XL for ETCnomad

This is an unfinished script that allows you to use the [Novation LaunchControl XL (v3)](https://amzn.to/4m6tObU) as an encoder and fader wing for ETCnomad.

I've only tested it on macOS but no reason it shouldn't work on Windows either. At some point I'll make this into a friendly application rather than a command-line tool, but given the intended audience I don't imagine you'll have any problems with the command line version. 

Edit these two parameters in the file to point to your Eos console or ETCnomad (by default it will connect to ETCnomad on your local computer)
```
const EOS_CONSOLE_IP = "127.0.0.1";
const EOS_CONSOLE_PORT = 8000;
```
Then simply run the script and use your LaunchControl XL to control ETC, you can adjust the functionaltiy by changing the code - it's fairly obvious and simply commented, but by default it is configured as follows;

### Using It

This is very much configured how I use it, feel free to change the code. I plan to make a GUI version at some point like the excellent [TwisterEos](https://en.nolaskey.com/twistereos) but, until then, it works for me...

#### Encoders

The encoders are arranged as follows which makes sense for most of my own shows. Again, I will make a GUI for it at some point

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 
|---------|------------------|----------------|----------------|----------------|----------------|----------------|----------------|
| Frame Angle A | Frame Angle B | Frame Angle C | Frame Angle D | Iris | Edge | Zoom | Intensity |
| Frame Thrust A | Frame Thrust B | Frame Thrust C | Frame Thrust D | Frame Assembly Rot. | - | Pan | Tilt |
| Red | Amber | Mint/Lime | Green | Blue | Cyan | Magenta | Yellow |


They're grouped relatively sensibly (imho)
- Top left has all the framing shutters and hinted blue
- Bottom row is colour mixing
- Pan / Tilt are both hinted green
- Iris/Edge/Zoom are hinted magenta
- Intensity is White

#### Faders

The eight faders correspond to Faders 1-8 on Eos, the buttons below each fader act like the Fire and Stop/Back buttons, and therefore respect the configuration you've set for them in Fader Config on the console. 

Fader buttons are only illuminated when there is something programmed on the corresponding fader. 

Some faders are colour-coded;
- Submaster Amber
- Cue Lists will show Red/Green buttons
- Focus Palettes Dark Green
- Beam Palettes Dark Blue
- Presets Teal
- Manual Time Faders Blue (also, will flash optionally with time selected - see limitations below)
- Global FX Purple
- Grand Master Red (Both buttons shown red, as top button is not configurable)
 
It's not possible to determine an inhibited sub by OSC, but if you include 'Inhib' in the name then it will be shown red rather than green in the lower button.

As of v0.3 Manual Time faders will be shown blue and can optionally flash to indicate the selected time subject to the following limitations;
- The time must be set on the LaunchControl, if you set it elsewhere it wont update (yet)
- Only one manual time fader is supported
- If you disconnect and reconnect the LaunchControl it will stop flashing

As of v0.2 All Faders will flash if the value on the desk has changed from what is set on the wing. By default a flag called `FADER_MANTIME_FLASH` is enabled which requires you to move the fader up/down to 'catch' the existing value before it will adjust to prevent any sudden changes on stage, this is in keeping with many controllers. The LCD will indicate the current set value and the direction the fader needs to be moved (via `^` and `v` indications) to reach the captured value

#### Cue Stack

The "Record" (Round Red Button) acts as STOP/BACK and the Play button acts as GO as you'd expect. The current Cue is shown in the LCD display (but it does lag a bit)

When a cue stack is on a fader, the two buttons beneath the fader will show Red (STOP/BACK) and Green (GO) as appropriate

#### Other Features

The Track Prev/Next buttons act as LAST/NEXT

If the console is locked, a CONSOLE LOCKED message is displayed on the LaunchControl also and all functions are disabled

### Where can I get one? 
 
Glad you asked, if you find this useful please consider using this affiliate link to get yours from Amazon :) 

https://amzn.to/4m6tObU

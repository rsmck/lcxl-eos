# Novation LaunchControl XL for ETCnomad

This is an unfinished script that allows you to use the [Novation LaunchControl XL (v3)](https://amzn.to/4m6tObU) as an encoder and fader wing for ETCnomad.

More information can be found at https://rsmck.co.uk/blog/launchcontrol-xl-3-for-eos/

I've only tested it on macOS but no reason it shouldn't work on Windows either. At some point I'll make this into a friendly application rather than a command-line tool, but given the intended audience I don't imagine you'll have any problems with the command line version. 

You can find a downloadable binary at https://www.dropbox.com/scl/fo/h5a97maqjsryjswbjk4v6/AP4U_8cqLa7A4jNJmG7ehrw?rlkey=20oqhu98bg6a1c3ckt5ouyerx&dl=0 

The binary is a command-line application and should be run with the optional -h (--host) and -p (--port) arguments to specify the location of ETCnomad (which must be configured to listen to OSC TCP on this Port using SLIP v1.1)

```
./lcxl_eos -h 127.0.0.1 -p 8001
```

If you're not using the binary., you can adjust the functionality by changing the code - it's fairly obvious and simply commented, but by default it is configured as follows;

### Using It

This is very much configured how I use it, feel free to change the code. I plan to make a GUI version at some point like the excellent [TwisterEos](https://en.nolaskey.com/twistereos) but, until then, it works for me...

#### Encoders

The encoders are arranged as follows which makes sense for most of my own shows. Again, I will make a GUI for it at some point

![encoders](https://github.com/user-attachments/assets/c3e1d9bf-6411-45c1-b6c5-62712db40ba6)

They're grouped relatively sensibly (imho)
- Top left has all the framing shutters and hinted blue
- Bottom row is colour mixing
- Pan / Tilt are both hinted green
- Iris/Edge/Zoom are hinted magenta
- Intensity is White

By default `DYNAMIC_ENCODERS` is enabled, and only the encoders valid for the selected fixtures will be illuminated 

#### Faders

The eight faders correspond to Faders 1-8 on Eos, the buttons below each fader act like the Fire and Stop/Back buttons, and therefore respect the configuration you've set for them in Fader Config on the console. 

As of v0.0.4 Fader buttons are only illuminated when there is something programmed on the corresponding fader. 

Some faders are colour-coded;
- Submasters are Amber
- Cue Lists will show Red/Green buttons
- Focus Palettes Dark Green
- Beam Palettes Dark Blue
- Presets Teal
- Manual Time Faders Blue (also, will flash optionally with time selected - see limitations below)
- Global FX Purple
- Grand Master Red (Both buttons shown red, as top button is not configurable)
 
It's possible to determine an inhibited sub by OSC but the script currently doesn't do that. By convention I tend to include 'Inhib' in the name, if you do then it will be shown red rather than green in the lower button - it's a bit hacky buit it works.

As of v0.0.3 Manual Time faders will be shown blue and can optionally flash to indicate the selected time subject to the following limitations;
- The time must be set on the LaunchControl, if you set it elsewhere it wont update (yet)
- Only one manual time fader is supported
- If you disconnect and reconnect the LaunchControl it will stop flashing

As of v0.0.2 All Faders will flash if the value on the desk has changed from what is set on the wing. By default a flag called `FADER_MANTIME_FLASH` is enabled which requires you to move the fader up/down to 'catch' the existing value before it will adjust to prevent any sudden changes on stage, this is in keeping with many controllers. The LCD will indicate the current set value and the direction the fader needs to be moved (via `^` and `v` indications) to reach the captured value

#### Cue Stack

The "Record" (Round Red Button) acts as STOP/BACK and the Play button acts as GO as you'd expect. The current Cue is shown in the LCD display (but it does lag a bit)

When a cue stack is on a fader, the two buttons beneath the fader will show Red (STOP/BACK) and Green (GO) as appropriate

#### Other Features

The Track Prev/Next buttons act as LAST/NEXT

The 'hidden' Novation logo button on the top row of fader buttons as as SELECT LAST.

If the console is locked, a CONSOLE LOCKED message is displayed on the LaunchControl also and all functions are disabled

### Where can I get one? 
 
Glad you asked, if you find this useful please consider using this affiliate link to get yours from Amazon :) 

https://amzn.to/4m6tObU

Also, in a bit of shameless self-promotion, maybe you want a keyboard to help make programming easier too? I'm responsible for the original lxkey and after a few issues it's available again (but in small batches at a time that sell out quickly) at lxkey.co.uk :) 

// Erzeugt aus den vom Nutzer gelieferten Geräte-Grafiken (public/devices/*.png): Seitenverhältnis, Display-Fläche und Anker (normiert 0..1).
export const IMG: Record<string, { aspect: number; lcd: [number, number, number, number]; pts: Record<string, [number, number]> }> = {
 "como": {
  "aspect": 0.467,
  "lcd": [
   0.2424,
   0.0769,
   0.7576,
   0.2308
  ],
  "pts": {
   "logo": [
    0.4941,
    0.0418
   ],
   "keypad": [
    0.4988,
    0.3571
   ],
   "speaker": [
    0.5765,
    0.3055
   ],
   "handle": [
    0.5059,
    0.6813
   ],
   "plate": [
    0.1412,
    0.5714
   ],
   "ring": [
    0.4824,
    0.9505
   ],
   "label": [
    0.4941,
    0.6319
   ]
  }
 },
 "mgmg": {
  "aspect": 0.4053,
  "lcd": [
   0.2468,
   0.4474,
   0.7325,
   0.6737
  ],
  "pts": {
   "sensor": [
    0.4935,
    0.2368
   ],
   "status": [
    0.4935,
    0.4632
   ],
   "keys": [
    0.4935,
    0.7705
   ],
   "led": [
    0.5065,
    0.0284
   ],
   "brand": [
    0.4935,
    0.86
   ],
   "clip": [
    0.4935,
    0.9368
   ]
  }
 },
 "pid": {
  "aspect": 0.2926,
  "lcd": [
   0.2,
   0.3117,
   0.8,
   0.4362
  ],
  "pts": {
   "inlet": [
    0.4909,
    0.117
   ],
   "leds": [
    0.4982,
    0.2766
   ],
   "keys": [
    0.5273,
    0.6064
   ],
   "battery": [
    0.5273,
    0.8404
   ],
   "conn": [
    0.5273,
    0.9628
   ],
   "antenna": [
    0.4982,
    0.0585
   ]
  }
 },
 "dlm": {
  "aspect": 0.6221,
  "lcd": [
   0.2617,
   0.2419,
   0.7383,
   0.4419
  ],
  "pts": {
   "keys": [
    0.4953,
    0.7
   ],
   "conn": [
    0.4579,
    0.9593
   ],
   "led": [
    0.1963,
    0.0756
   ],
   "brand": [
    0.4953,
    0.5349
   ],
   "title": [
    0.6168,
    0.1628
   ]
  }
 },
 "ims": {
  "aspect": 0.5376,
  "lcd": [
   0.2731,
   0.4358,
   0.7699,
   0.5283
  ],
  "pts": {
   "leds": [
    0.5161,
    0.6127
   ],
   "inlet": [
    0.172,
    0.2798
   ],
   "speaker": [
    0.3828,
    0.3503
   ],
   "cap": [
    0.5161,
    0.1445
   ],
   "conn": [
    0.5806,
    0.9191
   ],
   "brand": [
    0.5161,
    0.3121
   ]
  }
 }
} as any;

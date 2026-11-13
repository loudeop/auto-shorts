import React from 'react';
import {Composition} from 'remotion';
import {Full} from './Full.jsx';
import timing from './timing.json';
export const Root = () => (
  <Composition id="Story" component={Full} width={timing.width || 720} height={timing.height || 1280} fps={30}
    durationInFrames={Math.round(timing.duration * 30)} />
);

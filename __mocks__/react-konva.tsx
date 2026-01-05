// Mock react-konva for Jest tests
import React from 'react';

export const Stage = ({ children, ...props }: any) => (
  <div data-testid="konva-stage" {...props}>
    {children}
  </div>
);

export const Layer = ({ children }: any) => <div data-testid="konva-layer">{children}</div>;

export const Line = ({ points }: any) => (
  <div data-testid="konva-line" data-points={JSON.stringify(points)} />
);

export const Rect = () => <div data-testid="konva-rect" />;

export const Group = ({ children }: any) => <div data-testid="konva-group">{children}</div>;

export const Text = ({ text }: any) => <div data-testid="konva-text">{text}</div>;

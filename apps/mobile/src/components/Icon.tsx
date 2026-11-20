// Simple line icons (24×24, 2px stroke) drawn with react-native-svg. Used instead of emoji so the UI looks
// the same on every phone and stays calm.
import React from "react";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

const ICONS = {
  home: <><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Polyline points="9 22 9 12 15 12 15 22" /></>,
  book: <><Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  chat: <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  calendar: <><Rect x={3} y={4} width={18} height={18} rx={2} /><Line x1={16} y1={2} x2={16} y2={6} /><Line x1={8} y1={2} x2={8} y2={6} /><Line x1={3} y1={10} x2={21} y2={10} /></>,
  user: <><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx={12} cy={7} r={4} /></>,
  users: <><Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><Circle cx={9} cy={7} r={4} /><Path d="M23 21v-2a4 4 0 0 0-3-3.87" /><Path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  menu: <><Line x1={3} y1={6} x2={21} y2={6} /><Line x1={3} y1={12} x2={21} y2={12} /><Line x1={3} y1={18} x2={21} y2={18} /></>,
  lock: <><Rect x={3} y={11} width={18} height={11} rx={2} /><Path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  chart: <><Line x1={12} y1={20} x2={12} y2={10} /><Line x1={18} y1={20} x2={18} y2={4} /><Line x1={6} y1={20} x2={6} y2={16} /></>,
  phone: <><Rect x={5} y={2} width={14} height={20} rx={2} /><Line x1={12} y1={18} x2={12.01} y2={18} /></>,
  shield: <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  sliders: <><Line x1={4} y1={21} x2={4} y2={14} /><Line x1={4} y1={10} x2={4} y2={3} /><Line x1={12} y1={21} x2={12} y2={12} /><Line x1={12} y1={8} x2={12} y2={3} /><Line x1={20} y1={21} x2={20} y2={16} /><Line x1={20} y1={12} x2={20} y2={3} /><Line x1={1} y1={14} x2={7} y2={14} /><Line x1={9} y1={8} x2={15} y2={8} /><Line x1={17} y1={16} x2={23} y2={16} /></>,
  key: <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />,
  trash: <><Polyline points="3 6 5 6 21 6" /><Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  close: <><Line x1={18} y1={6} x2={6} y2={18} /><Line x1={6} y1={6} x2={18} y2={18} /></>,
  mic: <><Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><Path d="M19 10v2a7 7 0 0 1-14 0v-2" /><Line x1={12} y1={19} x2={12} y2={23} /><Line x1={8} y1={23} x2={16} y2={23} /></>,
  stop: <Rect x={6} y={6} width={12} height={12} rx={1} />,
  eye: <><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx={12} cy={12} r={3} /></>,
  eyeOff: <><Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><Line x1={1} y1={1} x2={23} y2={23} /></>,
  plus: <><Line x1={12} y1={5} x2={12} y2={19} /><Line x1={5} y1={12} x2={19} y2={12} /></>,
  check: <Polyline points="20 6 9 17 4 12" />,
  clock: <><Circle cx={12} cy={12} r={10} /><Polyline points="12 6 12 12 16 14" /></>,
  ban: <><Circle cx={12} cy={12} r={10} /><Line x1={4.93} y1={4.93} x2={19.07} y2={19.07} /></>,
  chevronRight: <Polyline points="9 18 15 12 9 6" />,
  logOut: <><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline points="16 17 21 12 16 7" /><Line x1={21} y1={12} x2={9} y2={12} /></>,
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color = "#0E2A33", strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      {ICONS[name]}
    </Svg>
  );
}

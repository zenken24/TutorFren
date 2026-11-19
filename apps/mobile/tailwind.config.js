// Theme tokens: change colours here when the Stitch designs arrive. Amber (never red) for "needs practice".
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0F766E", dark: "#115E59", soft: "#CCFBF1", tint: "#F0FDFA" },
        practice: { DEFAULT: "#D97706", soft: "#FEF3C7" },
        ink: { DEFAULT: "#0F2A2E", soft: "#4B6468", faint: "#8AA0A3" },
        surface: { DEFAULT: "#FFFFFF", page: "#F3F7F6", line: "#DCE7E5" },
      },
      borderRadius: { card: "16px" },
      fontFamily: { sans: ["NotoSansBengali_400Regular"] }, // weights map to the Medium/Bold files in AppText.tsx
    },
  },
  plugins: [],
};

// Theme tokens. Chrome yellow for "needs practice"; red only for destructive actions.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // palette: blue sapphire #035B7B · sky blue #62EAF9 · chrome yellow #FFAA00 · metallic yellow #FFDD15
        //          metallic seaweed #167B7B · vivid lime #B0D80B   (red only for destructive actions)
        primary: { DEFAULT: "#035B7B", dark: "#024560", soft: "#D7ECF3", tint: "#EEF7FA" },
        good: { DEFAULT: "#167B7B", soft: "#D5EDEC", text: "#0F5C5C" },
        practice: { DEFAULT: "#FFAA00", soft: "#FFF0CC", text: "#7A4E00" },
        hot: { DEFAULT: "#FFDD15", soft: "#FFF8C4", text: "#6B5A00" },
        info: { DEFAULT: "#62EAF9", soft: "#DDFAFE", text: "#035B7B" },
        lime: { DEFAULT: "#B0D80B", soft: "#F1F8D0", text: "#4F6300" },
        danger: { DEFAULT: "#C62828", soft: "#FBE3E3" },
        ink: { DEFAULT: "#0E2A33", soft: "#4A6670", faint: "#8FA6AD" },
        surface: { DEFAULT: "#FFFFFF", page: "#F4FAFB", line: "#D6E6EA" },
      },
      borderRadius: { card: "16px" },
      fontFamily: { sans: ["NotoSansBengali_400Regular"] }, // weights map to the Medium/Bold files in AppText.tsx
    },
  },
  plugins: [],
};

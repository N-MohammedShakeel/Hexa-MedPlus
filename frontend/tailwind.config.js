/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary Blues (from Figma)
        primary: {
          50: "#E8F0FE",
          100: "#DAE2FF",
          200: "#D0E1FB",
          300: "#B2C5FF",
          400: "#7BA4FF",
          500: "#0052CC",
          600: "#003D9B",
          700: "#00307A",
          800: "#002460",
          900: "#001848",
        },
        // Neutrals (from Figma)
        neutral: {
          50: "#F7F9FB",
          100: "#F2F4F6",
          200: "#ECEEF0",
          300: "#E6E8EA",
          400: "#E0E3E5",
          500: "#C3C6D6",
          600: "#737685",
          700: "#505F76",
          800: "#434654",
          900: "#191C1E",
          950: "#101C2B",
        },
        // Status Colors
        success: {
          50: "#D1FAE5",
          100: "#85F8C4",
          500: "#059669",
          600: "#047857",
          700: "#002114",
        },
        danger: {
          50: "#FFDAD6",
          100: "#FFF1F2",
          200: "#FECDD3",
          500: "#BA1A1A",
          600: "#93000A",
          700: "#881337",
        },
        info: {
          50: "#D0E1FB",
          100: "#DAE2FF",
          500: "#54647A",
          600: "#3D4F63",
        },
        warning: {
          50: "#FEF3C7",
          500: "#D97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        10: ["0.625rem", { lineHeight: "0.9375rem" }],
        11: ["0.6875rem", { lineHeight: "1.125rem" }],
        12: ["0.75rem", { lineHeight: "1rem" }],
        13: ["0.8125rem", { lineHeight: "1.125rem" }],
        14: ["0.875rem", { lineHeight: "1.25rem" }],
        16: ["1rem", { lineHeight: "1.5rem" }],
        18: ["1.125rem", { lineHeight: "1.5rem" }],
        20: ["1.25rem", { lineHeight: "1.4rem" }],
        24: ["1.5rem", { lineHeight: "1.33rem" }],
        28: ["1.75rem", { lineHeight: "1.4rem" }],
        32: ["2rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: {
        2: "0.125rem",
        4: "0.25rem",
        6: "0.375rem",
        8: "0.5rem",
        12: "0.75rem",
      },
      boxShadow: {
        card: "0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.03)",
        modal: "0px 8px 30px rgba(0, 0, 0, 0.12)",
        dropdown: "0px 4px 16px rgba(0, 0, 0, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

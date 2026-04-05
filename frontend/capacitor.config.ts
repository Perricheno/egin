import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kz.agriplan.app",
  appName: "AgriPlan",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;

import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

const config = loadConfig();
const handle = createApp(config);
handle.app
  .listen({ port: config.port, host: "0.0.0.0" })
  .then((addr) => console.log(`leeter listening on ${addr}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

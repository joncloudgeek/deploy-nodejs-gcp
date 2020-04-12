const app = require("./app.js");

require("greenlock-express")
  .init({
    packageRoot: __dirname,
    configDir: "./greenlock.d",
    maintainerEmail: "jon@joncloudgeek.com",
    cluster: false // whether or not you are using Node.s clusters
  })
  // Serves on 80 and 443
  // Get's SSL certificates magically!
  .serve(app);
// server.js - Production entrypoint for cPanel Phusion Passenger
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const hostname = '0.0.0.0';
process.env.PORT = port;
process.env.HOSTNAME = hostname;
process.env.NODE_ENV = 'production';

// Check if standalone runner exists from cPanel deployment bundle
const standaloneBackup = path.join(__dirname, 'server.standalone.js');
const standaloneSub = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standaloneBackup)) {
  require(standaloneBackup);
} else if (fs.existsSync(standaloneSub)) {
  require(standaloneSub);
} else {
  const { createServer } = require('http');
  const { parse } = require('url');
  let next;
  try {
    next = require('next');
  } catch (err) {
    console.error('Next module could not be loaded directly:', err.message);
  }

  if (next) {
    const app = next({ dev: false, hostname, port });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Error handling request:', req.url, err);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      }).listen(port, (err) => {
        if (err) throw err;
        console.log(`> TourFlow Next.js server ready on port ${port}`);
      });
    }).catch((err) => {
      console.error('Failed to prepare Next.js app:', err);
      process.exit(1);
    });
  } else {
    console.error('Fatal: Neither standalone server nor Next.js module found.');
    process.exit(1);
  }
}

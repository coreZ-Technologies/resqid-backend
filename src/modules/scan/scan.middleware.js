// scan.middleware.js
export const serveEmergencyHtml = (req, res, next) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return res.sendFile('emergency.html', {
      root: path.join(__dirname, '../../../public'),
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });
  }
  next();
};

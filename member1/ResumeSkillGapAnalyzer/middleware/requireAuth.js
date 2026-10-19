
module.exports = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ message: "Please log in." });
    }
    return res.redirect("/login");
  }

  next();
};

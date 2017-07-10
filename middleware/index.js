const Campground = require("../models/campground");
const Comment = require("../models/comment");

// all the middleware goes here
const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function checkCampgroundOwnership(req, res, next) {
  if (req.isAuthenticated()) {
    Campground.findById(req.params.id, (err, foundCampground) => {
      if (err) {
        req.flash("error", "Campground not found!");
        res.redirect("back");
      } else {
        if (foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
          next();
        } else {
          req.flash("error", "You don't have permission to do that!");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You need to be logged in to do that!");
    res.redirect("back");
  }
};

middlewareObj.checkCommentOwnership = function checkCommentOwnership(req, res, next) {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, (err, foundComment) => {
      if (err) {
        req.flash("error", "Comment not found!");
        res.redirect("back");
      } else {
        if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
          next();
        } else {
          req.flash("error", "You don't have permission to do that!");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You need to be logged in to do that!");
    res.redirect("back");
  }
};

middlewareObj.isLoggedIn = function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.redirectTo = req.originalUrl;
  req.flash("error", "You need to be logged in to do that!")
  res.redirect("/accounts/login");
};

middlewareObj.isEmailAuthenticated = function isEmailAuthenticated(req, res, next) {
  if (req.user.isEmailAuthenticated === true) {
    return next();
  }
  req.flash("error", "You need to authenticate your email before you can do that!")
  if (req.headers.referer === `${req.protocol}://${req.headers.host}/accounts/login`) {
    return res.redirect("/campgrounds");
  }
  res.redirect("back");
};

module.exports = middlewareObj;

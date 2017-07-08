const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware");
const geocoder = require("geocoder");

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// INDEX - show all campgrounds
router.get("/", (req, res) => {
  if (req.query.search) {
    // fuzzy search
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Campground.find({ name: regex }, (err, campgrounds) => {
      if (err) {
        console.log(err);
      } else {
        if (campgrounds.length == 0) {
          res.render("campgrounds/index", { campgrounds, page: "campgrounds", error: "No campgrounds found!" });
        } else {
          res.render("campgrounds/index", { campgrounds, page: "campgrounds" });
        }
      }
    });
  } else {
    // Get all campgrounds from db
    Campground.find({}, (err, campgrounds) => {
      if (err) {
        console.log(err);
      } else {
        res.render("campgrounds/index", { campgrounds, page: "campgrounds" });
      }
    });
  }
});

// CREATE -- add new campground to DB
router.post("/", middleware.isLoggedIn, (req, res) => {
  // get data from form and add to campgrounds db
  const author = {
    id: req.user._id,
    username: req.user.username,
  };
  const newCampground = req.body.campground;
  newCampground.author = author;
  geocoder.geocode(req.body.location, (err, data) => {
    if (err) {
      req.flash("error", "Error finding campground location");
      res.redirect("/campgrounds/new");
    } else {
      newCampground.lat = data.results[0].geometry.location.lat;
      newCampground.lng = data.results[0].geometry.location.lng;
      newCampground.location = data.results[0].formatted_address;
      // create a new campground and save to db
      Campground.create(newCampground, (err, newlyCreated) => {
        if (err) {
          req.flash("error", "Error adding campground");
          res.redirect("back");
        } else {
          // redirect to campgrounds page
          req.flash("success", "Successfully added new campground!");
          res.redirect("/campgrounds");
        }
      });
    }
  });
});

// NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, (req, res) => {
  res.render("campgrounds/new");
});

// SHOW - shows more information for one campground
router.get("/:id", (req, res) => {
  // find the campground with the provided ID
  Campground.findById(req.params.id).populate("comments").exec((err, foundCampground) => {
    if (err) {
      console.log(err);
    } else {
      // render show template with that campground
      res.render("campgrounds/show", { campground: foundCampground });
    }
  });
});

// EDIT
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findById(req.params.id, (err, foundCampground) => {
    res.render("campgrounds/edit", { campground: foundCampground });
  });
});

// UPDATE
router.put("/:id", middleware.checkCampgroundOwnership, (req, res) => {
  let newCampground = req.body.campground;
  geocoder.geocode(req.body.location, (err, data) => {
    if (err) {
      req.flash("error", "Error finding campground location");
      res.redirect("/campgrounds/new");
    } else {
      newCampground.lat = data.results[0].geometry.location.lat;
      newCampground.lng = data.results[0].geometry.location.lng;
      newCampground.location = data.results[0].formatted_address;
      // create a new campground and save to db
      Campground.findByIdAndUpdate(req.params.id, newCampground, (err, updatedCampground) => {
        if (err) {
          req.flash("error", "Error updating campground");
          res.redirect("back");
        } else {
          req.flash("success", "Successfully updated campground!");
          res.redirect(`/campgrounds/${req.params.id}`);
        }
      });
    }
  });
});

// DESTROY - deletes campground route
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findByIdAndRemove(req.params.id, (err) => {
    if (err) {
      res.redirect("/campgrounds");
    } else {
      req.flash("success", "Successfully deleted campground!");
      res.redirect("/campgrounds");
    }
  });
});

module.exports = router;

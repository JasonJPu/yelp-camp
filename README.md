# YelpCamp

Yelp camp is an app for sharing campgrounds made using NodeJS, Express, and MongoDB. It is live here: https://tranquil-big-bend-37945.herokuapp.com

It is complete with the ability to add, update, and delete campgrounds, all implemented with RESTful routing. For each user, there is email authentication upon registration, and password resets in case the user has forgotten their email. A search menu in the navigation bar can be used for fuzzy searching campgrounds. Flash banners are at the top to provide success and error messages for the user.

In the campgounds' show page, the Google Maps API integration provides a visual for the location of each campground, while the time since created is shown along with information about the user who created the campground including a list of their other campgrounds. It supports comments attached to each campground, and for both campgrounds and comments it has user authorization for updating and deleting data.

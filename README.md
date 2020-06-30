# Newspack WooCommerce Memberships Auto-archive

This plugin is an extension for the WooCommerce Memberships.

It provides premium archived content to your WordPress/Newspack web site.

This is how it works -- the posts are kept public until a number of days which you define, after when they automatically become Restricted Content. This behavior can be turned on or off and customized per post.

## Installation

First make sure to first install WooCommerce Memberships, since this plugin won't work without it. Next, download this plugin's latest `.zip` file from Releases, and install it on your WordPress site.

## Development

To get set up for development, run `npm install && npm start`.

## Usage

This plugin adds a simple Pannel to the Block Editor Document settings side bar.

![image](https://user-images.githubusercontent.com/29167323/86023321-d2219e00-ba2b-11ea-9bc8-a351a9a6332e.png)

When the Auto Archive feature is turned on, it sets public access to that Post. After the defined number of days has passed, it automatically turns the Post to restricted content (gets archived). 

When the Post becomes Restricted Content, it will get all the Restriction Rules defined in your Memberships Plans.

### Integration with Memberships Plans

The WooCommerce suite enables a wide variety models of product sales. In order to use this plugin on your web site, the Memberships Plans need to be tuned to match this Plugin's functionality. When setting up your Memberships Plans rules, consider you will want certain Plans to have access to the content both while it is public, and also after the post has become restricted.

So, a simplest demo example of a Membership Plan setup which sets access restriction to all posts could be one like this:
- in WordPress Admin zone go to `WooCommerce` > `Memberships` > `Membership Plans` and select "Add Membership Plan"
  - enter a Plan title
  - in Plan's `Restricted Content` tab, select "Add New Rule": Type "Posts", Accessible "Immediately"
  - publish the Plan

With having this kind of a Plan setup, you can now test this plugin's functionality. A guest visitor will be able to access the post during the defined number of days, after which it will become restricted to them. And a Member which uses the Plan you created above, will be able to see the post both while it's public, and also when it gets restricted to the general public.

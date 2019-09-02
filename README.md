![Component to page Promo image](img/Banner.png?raw=true "Component to Page promo")

# Component to page
A small utility plugin for Figma to mimic Sketch's behaviour which moves symbols to a dedicated page. This plugin will create a new master component, move it to a dedicate page and leave an instance in its place. Properties like your constraints will be preserved on the instance.

### How it works
Use the plugin to create a new component. If you have multiple elements selected, you can also create multiple components at once.

#### About the components page
On first run, it will look for a page called Components. If this doesn't exist, it will look for a Symbols page (like you would find in a Sketch import). If either page does not exist, the plugin will create a new one. After creating this page, you can rename it and 'Component to page' will continue to use this page.

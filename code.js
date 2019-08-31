// get selection
// turn to component
// make an instance
// send MC to component page
// store id of components page here
var componentsPage;
// populate an array of all pages in doc
const pages = figma.root.children;
// loop through all pages and check for meta data
pages.forEach(page => {
    if (page.getPluginData('components') === 'true') {
        componentsPage = page;
    }
});
// check if a selection exists, stop running if not
if (figma.currentPage.selection.length === 0) {
    figma.notify('Please make a selection');
    figma.closePlugin();
}
figma.showUI(__html__, { width: 360, height: 92 });
figma.ui.onmessage = function (msg) {
    var componentName;
    if (!msg.name) {
        componentName = 'Component';
    }
    else {
        componentName = msg.name;
    }
    // create page if component page doesn't exist
    if (!componentsPage) {
        let page = figma.createPage();
        page.name = 'Components';
        page.setPluginData('components', 'true');
        componentsPage = page;
    }
    // get selection and create empty master component
    const selection = figma.currentPage.selection;
    const component = figma.createComponent();
    // group the selection
    const group = figma.group(selection, figma.currentPage);
    const x = group.x;
    const y = group.y;
    const width = group.width;
    const height = group.height;
    //add group to component
    component.appendChild(group);
    //resize component and position group
    component.x = x;
    component.y = y;
    component.resize(width, height);
    component.name = componentName;
    group.x = 0;
    group.y = 0;
    // ungroup elements inside the component
    for (const node of group.children) {
        group.parent.appendChild(node);
    }
    // make an instance in the same place
    const instance = component.createInstance();
    instance.x = component.x;
    instance.y = component.y;
    // position in a row on components page
    const spacing = 24; //how far to space components out
    var yCoord = 0;
    var xCoord = 0;
    if (componentsPage.children.length !== 0) {
        const componentsPageChildren = componentsPage.children;
        const componentGroup = figma.group(componentsPageChildren, componentsPage);
        const componentWidth = componentGroup.width;
        const componentX = componentGroup.x;
        const componentY = componentGroup.y;
        for (const node of componentGroup.children) {
            componentGroup.parent.appendChild(node);
        }
        yCoord = componentY;
        xCoord = componentX + componentWidth + spacing;
    }
    // move master to designated page + position
    componentsPage.appendChild(component);
    component.x = xCoord;
    component.y = yCoord;
    //update the selection
    const page = figma.currentPage;
    var toSelect = [];
    toSelect.push(instance);
    page.selection = toSelect;
    // close the plugin
    figma.closePlugin();
};

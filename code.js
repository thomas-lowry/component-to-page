//
// GLOBAL VARS //////////
//
const selection = figma.currentPage.selection, componentSpacing = 24;
var componentsPage, componentName, toSelect = [], multipleComponents = false;
//
// COMMANDS //////////
//
if (figma.command === 'collect') {
    // this command will collect master comonents to components page
    collect();
}
else {
    // this option is used for creating new components
    create();
}
// 
// MESSAGES FROM UI //////////
//
figma.ui.onmessage = function (msg) {
    findOrMakeComponentsPage();
    if (msg.name) {
        componentName = msg.name;
    }
    if (msg.multipleComponents === true) {
        // create multiple components
        multipleComponents = true;
        selection.forEach(node => {
            if (!msg.name) {
                componentName = undefined;
            }
            createComponent(node);
        });
    }
    else {
        // create single component
        multipleComponents = false;
        createComponent(selection);
    }
    //update the selection
    const page = figma.currentPage;
    page.selection = toSelect;
    // close the plugin
    figma.closePlugin();
};
//
// CORE FUNCTIONS //////////
// 
// create components
function create() {
    if (checkData(selection) === true) {
        // display UI with option to create multiple components
        figma.showUI(__html__, { width: 360, height: 124 });
        // this passes a message to the UI so we can know to disable or enable the switch for multiple components
        // if there is only one element selected,  disable this option
        if (selection.length > 1) {
            figma.ui.postMessage({
                'multipleComponents': true
            });
        }
        else {
            figma.ui.postMessage({
                'multipleComponents': false
            });
        }
    }
    else {
        // terminate plugin if nothing selected
        figma.closePlugin('Please make a selection');
    }
}
// collect stray components
function collect() {
    findOrMakeComponentsPage();
    const componentNodes = findComponents();
    if (checkData(componentNodes) === true) {
        let componentCount = 0;
        let componentMessage;
        componentNodes.forEach(node => {
            replaceWithInstanceAndMove(node);
            componentCount++;
        });
        //display correct language
        if (componentCount === 1) {
            componentMessage = ' component.';
        }
        else {
            componentMessage = ' components.';
        }
        // terminate plugin and display message
        figma.closePlugin('Successfully moved ' + componentCount + componentMessage);
    }
    else {
        // terminate plugin if nothing selected
        figma.closePlugin('There are no stay components to move.');
    }
}
// create a component and move it to components page
function createComponent(nodes) {
    // make sure all nodes are within an array
    // do this so that if multiple components is selected
    // and nodes param is not an array, we turn it into one
    // so that the loops work
    var nodeArr;
    if (multipleComponents) {
        nodeArr = [nodes];
    }
    else {
        nodeArr = nodes;
    }
    // check nodes + node children + grandchildren for master components
    // this will populate an error so we can throw a messsage for the user
    // hoping this sort of behaviour is just to cover a fringe case
    // will explore replacing that master component with an instance and moving it
    // in a future iteration
    var componentInside = false;
    var componentsInsideSelection = [];
    nodeArr.forEach(node => {
        if (node.type === 'COMPONENT') {
            componentInside = true;
            componentsInsideSelection.push(node);
        }
        if (node.type === 'FRAME' || node.type === 'GROUP') {
            if (node.children.length >= 1) {
                node.children.forEach(child => {
                    if (child.type === 'COMPONENT') {
                        componentInside = true;
                        componentsInsideSelection.push(child);
                    }
                    if (child.type === 'FRAME' || child.type === 'GROUP') {
                        if (child.children.length >= 1) {
                            child.children.forEach(grandChild => {
                                if (grandChild.type === 'COMPONENT') {
                                    componentInside = true;
                                    componentsInsideSelection.push(grandChild);
                                }
                            });
                        }
                    }
                });
            }
        }
    });
    if (componentInside) {
        figma.notify('Selection cannot contain a master component');
        console.log('arrrr!');
        if (multipleComponents = false) {
            //update the selection so master components are easy to find
            figma.currentPage.selection = componentsInsideSelection;
            figma.closePlugin();
            throw new Error('Selection cannot contain a master component');
        }
    }
    if (!componentInside) {
        // get some basic info  about the selection
        // we need to find the top most index of the nodes
        // we also need the x and y coordinate relative to the parent
        // we will use this when we insert the instance in place
        let instancePlacement = getCoordsIndexParent(nodeArr);
        // first we need to create an empty component
        const component = figma.createComponent();
        // group the selection
        // this makes it easier to calculate total size for the component for when we reszie it
        const group = figma.group(nodeArr, figma.currentPage);
        const width = group.width;
        const height = group.height;
        //resize component and position group
        component.resize(width, height);
        //add group to component
        component.appendChild(group);
        group.x = 0;
        group.y = 0;
        // ungroup elements inside the component
        // we don't need the group anymore
        for (const node of group.children) {
            group.parent.appendChild(node);
        }
        // make an instance in the same place and insert at correct index
        const instance = component.createInstance();
        let instanceIndex;
        if (instancePlacement.index > instancePlacement.parent.children.length) {
            if (instancePlacement.parent.children.length === 0) {
                instanceIndex = 0;
            }
            else {
                instanceIndex = instancePlacement.parent.children.length;
            }
        }
        else {
            instanceIndex = instancePlacement.index;
        }
        instancePlacement.parent.insertChild(instanceIndex, instance);
        instance.x = instancePlacement.x;
        instance.y = instancePlacement.y;
        // check if there is only one child that is a frame
        // if there is, move contents isnide component and delete frame
        // preserve background color of original frame
        if (component.children.length === 1) {
            let child = component.children[0];
            let name = child.name;
            if (!componentName) {
                componentName = name;
            }
            if (child.type === 'FRAME' || child.type === 'GROUP') {
                // copy properties from frame/group to component
                component.backgroundStyleId = child.backgroundStyleId;
                component.backgrounds = child.backgrounds;
                component.blendMode = child.blendMode;
                component.clipsContent = child.clipsContent;
                component.effectStyleId = child.effectStyleId;
                component.effects = child.effects;
                component.exportSettings = child.exportSettings;
                component.gridStyleId = child.gridStyleId;
                component.guides = child.guides;
                component.layoutGrids = child.layoutGrids;
                component.locked = child.locked;
                component.opacity = child.opacity;
                component.exportSettings = child.exportSettings;
                component.visible = child.visible;
                // copy properties to instance
                instance.constraints = child.constraints;
                if (child.children.length > 0) {
                    let children = child.children;
                    children.forEach(node => {
                        child.parent.appendChild(node);
                    });
                }
                child.remove();
            }
        }
        // move component to components page and position
        let componentInfo = getWidthAndPosition();
        componentsPage.appendChild(component);
        component.x = componentInfo.x;
        component.y = componentInfo.y;
        // assign a name if there is one
        // otherwise component will get default 'component' name
        if (componentName) {
            component.name = componentName;
        }
        //update selection
        toSelect.push(instance);
    }
}
// find the dedicated components page or make one
function findOrMakeComponentsPage() {
    let pages = figma.root.children;
    // check for destablished components page
    pages.forEach(page => {
        if (page.getPluginData('components') === 'true') {
            //dedicated plugins page has already been established
            componentsPage = page;
        }
    });
    if (componentsPage) {
        return;
    }
    // check for components page
    pages.forEach(page => {
        let pageName = page.name;
        pageName = pageName.toLocaleLowerCase();
        if (pageName === 'components') {
            // dedicated components page already exists, will use this page
            componentsPage = page;
        }
    });
    if (componentsPage) {
        return;
    }
    // check for symbols page
    pages.forEach(page => {
        let pageName = page.name;
        pageName = pageName.toLocaleLowerCase();
        if (pageName === 'symbols') {
            //dedicated plugins page has already been established
            componentsPage = page;
        }
    });
    if (componentsPage) {
        return;
    }
    if (!componentsPage) {
        let newPage = figma.createPage();
        newPage.name = 'Components';
        newPage.setPluginData('components', 'true');
        componentsPage = newPage;
    }
}
// move component and replace with instance
function replaceWithInstanceAndMove(node) {
    const parent = node.parent;
    const instance = node.createInstance();
    const index = parent.children.indexOf(node);
    const xCoord = node.x;
    const yCoord = node.y;
    //move master component
    let componentInfo = getWidthAndPosition();
    componentsPage.appendChild(node);
    node.x = componentInfo.x;
    node.y = componentInfo.y;
    //move and position instance
    parent.insertChild(index, instance);
    instance.x = xCoord;
    instance.y = yCoord;
}
// 
// HELPER FUNCTIONS //////////
//
// Check to see if array of nodes is empty or not
function checkData(nodes) {
    if (nodes.length >= 1) {
        return true;
    }
    else {
        return false;
    }
}
// find component nodes
function findComponents() {
    const components = figma.root.findAll(c => c.type === 'COMPONENT' && c.parent != componentsPage);
    return components;
}
// get the x/y coordinates to place the new instance and get top most index
function getCoordsIndexParent(nodes) {
    let xCoords = [];
    let yCoords = [];
    let indexes = [];
    let parent = nodes[0].parent;
    console.log(parent);
    nodes.forEach(node => {
        xCoords.push(node.x);
        yCoords.push(node.y);
        indexes.push(parent.children.indexOf(node));
    });
    let instancePlacement = {
        'x': Math.min.apply(null, xCoords),
        'y': Math.min.apply(null, yCoords),
        'index': Math.max.apply(null, indexes),
        'parent': parent
    };
    return instancePlacement;
}
// get overall width, and position of all contexts of components page
function getWidthAndPosition() {
    // check to see if components page is empty
    if (componentsPage.children.length > 0) {
        // group all of the children on components page
        // I do this because its a simple way to get overall width of elements
        let componentGroup = figma.group(componentsPage.children, componentsPage);
        // populate object with all info req. to position new components
        let result = {
            'x': componentGroup.x + componentGroup.width + componentSpacing,
            'y': componentGroup.y
        };
        // denest grouped elements back to parent node
        for (let node of componentGroup.children) {
            componentGroup.parent.appendChild(node);
        }
        return result;
    }
    else {
        // if empty, position first component at 0,0
        let result = {
            'x': 0,
            'y': 0
        };
        return result;
    }
}

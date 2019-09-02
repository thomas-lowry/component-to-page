//
// VARIABLES //////////
//
const selection = figma.currentPage.selection;
const componentSpacing = 24; //spacing between components on the components page
var componentsPage, componentName, toSelect = [], multipleComponents = false;


//
// ERROR HANDLING ON INIT //////////
//

// Check selection
// Terminate plugin if selection is empty
if (selection.length === 0) {
	
	// terminate plugin if nothing selected
	figma.closePlugin('Please make a selection');

} else if (selection.length >= 1) {
	
	// display UI with option to create multiple components
	figma.showUI(__html__, { width: 360, height: 124 });
	
	// this passes a message to the UI so we can know to disable or enable the switch for multiple components
	// if there is only one element selected,  disable this option
	if (selection.length > 1) {
		figma.ui.postMessage({
        	'multipleComponents': true
		});
	} else {
		figma.ui.postMessage({
			'multipleComponents': false
		});
	}

}

//
// COMMUNITCATE WITH UI //////////
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

	} else {
		// create single component
		multipleComponents = false;
		createComponent(selection);
	}

	//update the selection
	const page = figma.currentPage;
	page.selection = toSelect;

	// close the plugin
	figma.closePlugin();

}


//
// FUNCTIONS ////////
//

// create a component and move it to components page
function createComponent(nodes) {

	// make sure all nodes are within an array
	// do this so that if multiple components is selected
	// and nodes param is not an array, we turn it into one
	// so that the loops work
	var nodeArr;
	if (multipleComponents === true) {
		nodeArr = [nodes];
	} else {
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
							child.children.forEach(grandChild =>{
								if (grandChild.type === 'COMPONENT') {
									componentInside = true;
									componentsInsideSelection.push(grandChild);
								}
							})
						}
					}

				})
			}
		}
	});

	if (componentInside === true) {
		figma.notify('Selection cannot contain a master component');
		if (multipleComponents === false) {
			//update the selection so master components are easy to find
			figma.currentPage.selection = componentsInsideSelection;
			figma.closePlugin();
			throw new Error('Selection cannot contain a master component');
		}
	}

	if (componentInside === false) {
		// first we need to create an empty component
		const component = figma.createComponent();

		// group the selection
		// this makes it easier to calculate total size for the component for when we reszie it
		const group = figma.group(nodeArr, figma.currentPage);
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
		group.x = 0;
		group.y = 0;

		// ungroup elements inside the component
		// we don't need the group anymore
		for (const node of group.children) {
			group.parent.appendChild(node)
		}

		// make an instance in the same place
		const instance = component.createInstance();
		instance.x = component.x;
		instance.y = component.y;

		// check if there is only one child that is a frame
		// if there is, move contents isnide component and delete frame
		// preserve background color of original frame
		if(component.children.length === 1) {
			let child = component.children[0];
			let name = child.name;
			if (!componentName) {
				componentName = name;
			}
			
			if(child.type === 'FRAME' || child.type === 'GROUP') {

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
				instance.constraints = child.constraints

				if (child.children.length > 0) {
					let children = child.children;
					children.forEach(node => {
						child.parent.appendChild(node);
					})
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
		let pageName = page.name;
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
		newPage.setPluginData('components','true');
		componentsPage = newPage;
	}
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
		}

		// denest grouped elements back to parent node
		for (let node of componentGroup.children) {
			componentGroup.parent.appendChild(node)
		}
		return result;

	} else {

		// if empty, position first component at 0,0
		let result = {
			'x': 0,
			'y': 0
		}
		return result;
	}
}

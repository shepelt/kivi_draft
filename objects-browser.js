// Objects Browser - UI panel for viewing and selecting objects
import * as THREE from 'three';

export class ObjectsBrowser {
  constructor(kiviInstance) {
    this.kivi = kiviInstance;
    this.panel = null;
    this.selectedObject = null;
    this.collapsedFolders = new Set(); // Track which folders are collapsed

    this.createPanel();
    this.setupEventListeners();
  }

  createPanel() {
    // Create panel container
    this.panel = document.createElement('div');
    this.panel.id = 'objects-browser';
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 280px;
      background: rgba(240, 240, 240, 0.9);
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      overflow: hidden;
      z-index: 10;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 12px;
      background: #e0e0e0;
      border-bottom: 1px solid #ccc;
      font-weight: bold;
      color: #333;
    `;
    header.textContent = 'Objects';
    this.panel.appendChild(header);

    // Create objects list container
    this.listContainer = document.createElement('div');
    this.listContainer.style.cssText = `
      overflow-y: auto;
    `;
    this.panel.appendChild(this.listContainer);

    // Add to body
    document.body.appendChild(this.panel);

    // Initial render
    this.render();
  }

  setupEventListeners() {
    // Listen for object changes
    // We'll manually call render() when objects change
  }

  render() {
    // Clear list
    this.listContainer.innerHTML = '';

    // Get all objects
    const objects = this.kivi.objects;

    if (Object.keys(objects).length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.style.cssText = `
        padding: 12px;
        color: #999;
        text-align: center;
      `;
      emptyMessage.textContent = 'No objects';
      this.listContainer.appendChild(emptyMessage);
      return;
    }

    // Organize objects into folders
    const organized = this.organizeObjects(objects);

    // Render folders and objects
    this.renderFolder(organized, this.listContainer, 0);

    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  organizeObjects(objects) {
    // For now, detect THREE.Group objects as folders
    // and organize children under them
    const folders = {};
    const rootObjects = {};

    Object.entries(objects).forEach(([name, object]) => {
      if (object.type === 'Group' && object.children && object.children.length > 0) {
        // This is a folder
        folders[name] = {
          object: object,
          children: {}
        };
        // Add children to folder
        object.children.forEach((child, index) => {
          const childName = child.name || `${name}_child_${index}`;
          folders[name].children[childName] = child;
        });
      } else {
        // Root level object
        rootObjects[name] = object;
      }
    });

    return { folders, objects: rootObjects };
  }

  renderFolder(data, container, depth) {
    // Render folders first
    Object.entries(data.folders || {}).forEach(([name, folderData]) => {
      const folderItem = this.createFolderItem(name, folderData, depth);
      container.appendChild(folderItem);
    });

    // Then render objects
    Object.entries(data.objects || {}).forEach(([name, object]) => {
      const item = this.createObjectItem(name, object, depth);
      container.appendChild(item);
    });
  }

  createFolderItem(name, folderData, depth) {
    const folderContainer = document.createElement('div');

    // Folder header
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-item';
    folderHeader.dataset.folderName = name;
    folderHeader.style.cssText = `
      padding: 8px 12px;
      padding-left: ${12 + depth * 32}px;
      border-bottom: 1px solid #ddd;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
      cursor: pointer;
      user-select: none;
    `;

    // Hover effect
    folderHeader.addEventListener('mouseenter', () => {
      folderHeader.style.background = '#d0d0d0';
    });
    folderHeader.addEventListener('mouseleave', () => {
      folderHeader.style.background = 'transparent';
    });

    // Toggle arrow (> or v) - collapsed by default unless explicitly expanded
    const isCollapsed = !this.collapsedFolders.has(name); // Inverted logic - now tracks expanded folders
    const arrow = document.createElement('span');
    arrow.style.cssText = `
      width: 16px;
      height: 16px;
      min-width: 16px;
      font-size: 9px;
      color: #666;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      line-height: 1;
    `;
    arrow.textContent = isCollapsed ? '▶' : '▼';

    // Eye icon for folder visibility
    const eyeIconContainer = document.createElement('div');
    eyeIconContainer.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Check visibility from children
    let childrenVisible = true;
    if (folderData.object.children.length > 0) {
      childrenVisible = folderData.object.children[0].visible;
    }

    const eyeIcon = document.createElement('i');
    eyeIcon.setAttribute('data-lucide', childrenVisible ? 'eye' : 'eye-off');
    eyeIcon.style.cssText = `
      width: 16px;
      height: 16px;
      color: ${childrenVisible ? '#666' : '#ccc'};
    `;
    eyeIconContainer.appendChild(eyeIcon);

    eyeIconContainer.addEventListener('click', (e) => {
      e.stopPropagation();

      // Check current visibility state from first child
      let currentVisibility = true;
      if (folderData.object.children.length > 0) {
        currentVisibility = folderData.object.children[0].visible;
      }
      const newVisibility = !currentVisibility;

      // Keep the folder Group itself always visible
      folderData.object.visible = true;

      // Only toggle direct children visibility
      folderData.object.children.forEach((child) => {
        child.visible = newVisibility;
      });

      // Update the folder's tracked state
      folderData.object.userData = folderData.object.userData || {};
      folderData.object.userData.childrenVisible = newVisibility;

      const newIcon = document.createElement('i');
      newIcon.setAttribute('data-lucide', newVisibility ? 'eye' : 'eye-off');
      newIcon.style.cssText = `
        width: 16px;
        height: 16px;
        color: ${newVisibility ? '#666' : '#ccc'};
      `;
      eyeIconContainer.innerHTML = '';
      eyeIconContainer.appendChild(newIcon);
      lucide.createIcons();
      this.kivi.render();
    });

    // Folder name
    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = `
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    nameSpan.textContent = `📁 ${name}`;

    folderHeader.appendChild(arrow);
    folderHeader.appendChild(eyeIconContainer);
    folderHeader.appendChild(nameSpan);

    // Toggle collapse on header click
    folderHeader.addEventListener('click', () => {
      if (this.collapsedFolders.has(name)) {
        // Currently expanded, collapse it
        this.collapsedFolders.delete(name);
      } else {
        // Currently collapsed, expand it
        this.collapsedFolders.add(name);
      }
      this.render();
    });

    folderContainer.appendChild(folderHeader);

    // Children container
    if (!isCollapsed) {
      const childrenContainer = document.createElement('div');
      Object.entries(folderData.children).forEach(([childName, childObject]) => {
        const childItem = this.createObjectItem(childName, childObject, depth + 1);
        childrenContainer.appendChild(childItem);
      });
      folderContainer.appendChild(childrenContainer);
    }

    return folderContainer;
  }

  createObjectItem(name, object, depth = 0) {
    const item = document.createElement('div');
    item.className = 'object-item';
    item.dataset.objectName = name;
    item.style.cssText = `
      padding: 8px 12px;
      padding-left: ${12 + depth * 32}px;
      border-bottom: 1px solid #ddd;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
      white-space: nowrap;
    `;

    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.background = '#d0d0d0';
    });
    item.addEventListener('mouseleave', () => {
      if (this.selectedObject !== name) {
        item.style.background = 'transparent';
      }
    });

    // Eye icon container
    const eyeIconContainer = document.createElement('div');
    eyeIconContainer.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Eye icon - use 'eye' for visible, 'eye-off' for hidden
    const eyeIcon = document.createElement('i');
    eyeIcon.setAttribute('data-lucide', object.visible ? 'eye' : 'eye-off');
    eyeIcon.style.cssText = `
      width: 16px;
      height: 16px;
      color: ${object.visible ? '#666' : '#ccc'};
    `;
    eyeIcon.title = object.visible ? 'Hide object' : 'Show object';

    eyeIconContainer.appendChild(eyeIcon);

    // Toggle visibility on eye click
    eyeIconContainer.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't trigger item selection
      object.visible = !object.visible;

      // Replace icon with appropriate one (eye or eye-off)
      const newIcon = document.createElement('i');
      newIcon.setAttribute('data-lucide', object.visible ? 'eye' : 'eye-off');
      newIcon.style.cssText = `
        width: 16px;
        height: 16px;
        color: ${object.visible ? '#666' : '#ccc'};
      `;
      newIcon.title = object.visible ? 'Hide object' : 'Show object';

      eyeIconContainer.innerHTML = '';
      eyeIconContainer.appendChild(newIcon);
      lucide.createIcons();

      this.kivi.render(); // Re-render
    });

    item.appendChild(eyeIconContainer);

    // Content container (name and type on one line)
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      flex: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    // Click to select (on content, not eye icon)
    contentContainer.addEventListener('click', () => {
      this.selectObject(name);
    });

    // Object name
    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = `
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
    `;
    nameSpan.textContent = `📦 ${name}`;
    contentContainer.appendChild(nameSpan);

    // Object type (smaller, muted)
    const typeSpan = document.createElement('span');
    typeSpan.style.cssText = `
      font-size: 10px;
      color: #999;
    `;
    typeSpan.textContent = `(${object.type || 'Object3D'})`;
    contentContainer.appendChild(typeSpan);

    item.appendChild(contentContainer);

    return item;
  }

  selectObject(name) {
    // Deselect previous
    if (this.selectedObject) {
      const prevItem = this.listContainer.querySelector(`[data-object-name="${this.selectedObject}"]`);
      if (prevItem) {
        prevItem.style.background = 'transparent';
      }
    }

    // Select new
    this.selectedObject = name;
    const item = this.listContainer.querySelector(`[data-object-name="${name}"]`);
    if (item) {
      item.style.background = '#c0c0c0';
    }

    // Log selection
    console.log('Selected object:', name, this.kivi.objects[name]);
  }

  // Update the list when objects change
  update() {
    this.render();
  }

  // Show/hide panel
  show() {
    this.panel.style.display = 'block';
  }

  hide() {
    this.panel.style.display = 'none';
  }

  toggle() {
    this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none';
  }
}

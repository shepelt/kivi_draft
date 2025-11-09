// Objects Browser - UI panel for viewing and selecting objects
import * as THREE from 'three';

export class ObjectsBrowser {
  constructor(kiviInstance) {
    this.kivi = kiviInstance;
    this.panel = null;
    this.selectedObject = null;
    this.collapsedFolders = new Set(); // Track which folders are collapsed
    this.contextMenu = null; // Context menu element
    this.clipboard = null; // Clipboard for copy/paste

    this.createPanel();
    this.setupEventListeners();
    this.createContextMenu();
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

    // Disable default context menu on the panel
    this.panel.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

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
      if (object.type === 'Group') {
        // This is a folder (even if empty)
        folders[name] = {
          object: object,
          children: object.children || []  // Store children array directly
        };
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
      // Ensure object has a name
      if (!object.name) {
        object.name = name;
      }
      const item = this.createObjectItem(object, depth);
      container.appendChild(item);
    });
  }

  createFolderItem(name, folderData, depth) {
    const folderContainer = document.createElement('div');

    // Folder header
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-item';
    folderHeader.dataset.folderName = name;
    folderHeader.dataset.isFolder = 'true';
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

    // Check folder's own visibility (not children)
    const folderVisible = folderData.object.visible;

    const eyeIcon = document.createElement('i');
    eyeIcon.setAttribute('data-lucide', folderVisible ? 'eye' : 'eye-off');
    eyeIcon.style.cssText = `
      width: 16px;
      height: 16px;
      color: ${folderVisible ? '#666' : '#ccc'};
    `;
    eyeIconContainer.appendChild(eyeIcon);

    eyeIconContainer.addEventListener('click', (e) => {
      e.stopPropagation();

      // Toggle the folder's own visibility
      folderData.object.visible = !folderData.object.visible;

      // Re-render to update the icon state
      this.render();
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

    // Right-click for context menu on folder
    folderHeader.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, folderData.object, null, true);
    });

    folderContainer.appendChild(folderHeader);

    // Children container
    if (!isCollapsed) {
      const childrenContainer = document.createElement('div');
      folderData.children.forEach((childObject, index) => {
        // Ensure child has a name, generate one if missing
        if (!childObject.name) {
          childObject.name = `${name}_child_${index}`;
        }
        const childItem = this.createObjectItem(childObject, depth + 1, name);
        childrenContainer.appendChild(childItem);
      });
      folderContainer.appendChild(childrenContainer);
    }

    return folderContainer;
  }

  createObjectItem(object, depth = 0, parentFolder = null) {
    const item = document.createElement('div');
    item.className = 'object-item';
    item.dataset.objectName = object.name;
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
      if (this.selectedObject !== object.name) {
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
      this.selectObject(object.name);
    });

    // Right-click for context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, object, parentFolder);
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
    nameSpan.textContent = `📦 ${object.name}`;
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

  createContextMenu() {
    // Create context menu element
    this.contextMenu = document.createElement('div');
    this.contextMenu.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 4px 0;
      display: none;
      z-index: 1000;
      min-width: 150px;
      font-family: Arial, sans-serif;
      font-size: 12px;
    `;
    document.body.appendChild(this.contextMenu);

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
      this.hideContextMenu();
    });
  }

  showContextMenu(x, y, object, parentFolder = null, isFolder = false) {
    // Clear existing menu items
    this.contextMenu.innerHTML = '';

    // Check if this is a system folder or system item
    const isSystemItem = object.name === 'system' || parentFolder === 'system';

    // Check if this is a protected folder (system, bodies, sketches)
    const isProtectedFolder = isFolder && (object.name === 'system' || object.name === 'bodies' || object.name === 'sketches');

    // Create menu items
    const menuItems = [];

    // Copy (for non-folder items)
    if (object.type !== 'Group') {
      menuItems.push({
        label: 'Copy',
        action: () => {
          this.clipboard = {
            object: object,
            parentFolder: parentFolder,
            originalName: object.name  // Store the original name
          };
          console.log('Copied:', object.name);
          this.hideContextMenu();
        }
      });
    }

    // Paste (show if clipboard has content and we're in a folder OR on a folder, but not system folder)
    const targetFolder = isFolder ? object.name : parentFolder;
    const isSystemFolder = targetFolder === 'system';
    if (this.clipboard && targetFolder && !isSystemFolder) {
      menuItems.push({
        label: 'Paste',
        action: () => {
          const clone = this.clipboard.object.clone();
          // Keep the same position (don't offset)
          clone.position.copy(this.clipboard.object.position);

          // Generate new name based on original copied object's name
          const originalName = this.clipboard.originalName || 'object';
          clone.name = this.generateUniqueName(originalName, targetFolder);

          // Add to target folder
          const parent = this.kivi.objects[targetFolder];
          if (parent && parent.children) {
            parent.children.push(clone);
          }

          this.update();
          this.kivi.render();
          this.hideContextMenu();
        }
      });
    }

    // Only add Delete and Rename for non-system items and non-protected folders
    if (!isSystemItem && !isProtectedFolder) {
      menuItems.push({
        label: 'Delete',
        action: () => {
          // If this is a child of a folder, remove from parent's children
          if (parentFolder) {
            const parent = this.kivi.objects[parentFolder];
            if (parent && parent.children) {
              const childIndex = parent.children.indexOf(object);
              if (childIndex !== -1) {
                parent.children.splice(childIndex, 1);
              }
            }
          } else {
            // Top-level object, remove from KIVI registry
            this.kivi.removeObject(objectName);
          }
          this.update();
          this.kivi.render();
          this.hideContextMenu();
        }
      });
    }

    // Always add Show/Hide
    menuItems.push({
      label: object.visible ? 'Hide' : 'Show',
      action: () => {
        object.visible = !object.visible;
        this.kivi.render();
        this.update();
        this.hideContextMenu();
      }
    });

    // Only add Rename for non-system items and non-protected folders
    if (!isSystemItem && !isProtectedFolder) {
      menuItems.push({
        label: 'Rename',
        action: () => {
          const newName = prompt('Enter new name:', object.name);
          if (newName && newName !== object.name) {
            // Generate unique name if there's a conflict
            if (parentFolder) {
              object.name = this.generateUniqueNameForRename(newName, object, parentFolder);
            } else {
              object.name = newName;
            }
            this.update();
            this.kivi.render();
          }
          this.hideContextMenu();
        }
      });
    }

    // Add "Create Sketch" for sketches folder (disabled if sketch editor is active)
    if (isFolder && object.name === 'sketches') {
      const isEditing = this.kivi.system.sketchEditor?.isEditing;
      menuItems.push({
        label: 'Create Sketch',
        disabled: isEditing,
        action: () => {
          // Create a new sketch using the sketch editor
          if (this.kivi.system.sketchEditor && !isEditing) {
            this.kivi.system.sketchEditor.createSketch();
          }
          this.hideContextMenu();
        }
      });
    }

    // Add "Edit Sketch" and "Extrude" for sketch objects
    if (!isFolder && object.userData?.kivi?.type === 'sketch') {
      const isEditing = this.kivi.system.sketchEditor?.isEditing;

      menuItems.push({
        label: 'Edit Sketch',
        disabled: isEditing,
        action: () => {
          // Edit existing sketch
          if (this.kivi.system.sketchEditor && !isEditing) {
            this.kivi.system.sketchEditor.openSketchEditor(object);
          }
          this.hideContextMenu();
        }
      });

      // Check if sketch has closed loops
      const sketchData = object.userData?.kivi?.sketchData;
      const hasClosedLoops = sketchData?.detectClosedLoops().length > 0;

      menuItems.push({
        label: 'Extrude',
        disabled: !hasClosedLoops,
        action: () => {
          // Show extrude dialog
          this.showExtrudeDialog(object);
          this.hideContextMenu();
        }
      });
    }

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.textContent = item.label;

      const isDisabled = item.disabled || false;
      menuItem.style.cssText = `
        padding: 6px 12px;
        cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
        transition: background 0.2s;
        opacity: ${isDisabled ? '0.5' : '1'};
        color: ${isDisabled ? '#999' : '#000'};
      `;

      if (!isDisabled) {
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = '#f0f0f0';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action();
        });
      }

      this.contextMenu.appendChild(menuItem);
    });

    // Position and show menu
    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';
    this.contextMenu.style.display = 'block';
  }

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }
  }

  generateUniqueName(baseName, parentFolderName) {
    // Get all existing names in the parent folder
    const parent = this.kivi.objects[parentFolderName];
    if (!parent || !parent.children) return baseName;

    const existingNames = new Set(parent.children.map(child => child.name));

    // Start with _1 suffix
    let counter = 1;
    let newName = `${baseName}_${counter}`;
    while (existingNames.has(newName)) {
      counter++;
      newName = `${baseName}_${counter}`;
    }

    return newName;
  }

  generateUniqueNameForRename(desiredName, currentObject, parentFolderName) {
    // Get all existing names in the parent folder (excluding current object)
    const parent = this.kivi.objects[parentFolderName];
    if (!parent || !parent.children) return desiredName;

    const existingNames = new Set(
      parent.children
        .filter(child => child !== currentObject)
        .map(child => child.name)
    );

    // If desired name is available, use it
    if (!existingNames.has(desiredName)) {
      return desiredName;
    }

    // Otherwise add _1, _2, etc.
    let counter = 1;
    let newName = `${desiredName}_${counter}`;
    while (existingNames.has(newName)) {
      counter++;
      newName = `${desiredName}_${counter}`;
    }

    return newName;
  }

  showExtrudeDialog(sketch) {
    // Create modal dialog for extrude parameters
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      min-width: 300px;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Extrude Sketch</h3>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; font-size: 13px;">Distance:</label>
        <input type="number" id="extrude-distance" value="5" step="0.5" min="0.1"
          style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; font-size: 13px;">Direction:</label>
        <select id="extrude-direction" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <option value="1">Normal (forward)</option>
          <option value="-1">Reverse (backward)</option>
        </select>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="extrude-ok" class="btn btn-primary" style="flex: 1;">OK</button>
        <button id="extrude-cancel" class="btn btn-secondary" style="flex: 1;">Cancel</button>
      </div>
    `;

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.3);
      z-index: 9999;
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);

    // Handle OK button
    dialog.querySelector('#extrude-ok').addEventListener('click', () => {
      const distance = parseFloat(dialog.querySelector('#extrude-distance').value);
      const direction = parseInt(dialog.querySelector('#extrude-direction').value);

      // Perform extrude
      this.kivi.system.sketchEditor.extrudeSketch(sketch, distance, direction);

      // Close dialog
      document.body.removeChild(dialog);
      document.body.removeChild(backdrop);
    });

    // Handle Cancel button
    dialog.querySelector('#extrude-cancel').addEventListener('click', () => {
      document.body.removeChild(dialog);
      document.body.removeChild(backdrop);
    });

    // Close on backdrop click
    backdrop.addEventListener('click', () => {
      document.body.removeChild(dialog);
      document.body.removeChild(backdrop);
    });
  }
}

class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.projects = this.loadProjects();
        this.teams = this.loadTeams();
        this.stickyNotes = this.loadStickyNotes();
        this.currentView = 'dashboard';
        this.calendarDate = new Date();

        // Cache for DOM elements
        this.domCache = {};

        // Debounce timers
        this.debounceTimers = {};

        this.loadSettings();
        this.initializeElements();
        this.attachEventListeners();
        this.initializeKanban();
        this.renderProjects();
        this.renderTeams();
        this.updateProjectDropdown();
        this.render();
    }

    // Utility: Debounce function
    debounce(func, delay, key) {
        return (...args) => {
            clearTimeout(this.debounceTimers[key]);
            this.debounceTimers[key] = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Utility: Get cached DOM element
    getCachedElement(id) {
        if (!this.domCache[id]) {
            this.domCache[id] = document.getElementById(id);
        }
        return this.domCache[id];
    }

    loadSettings() {
        const settings = localStorage.getItem('projexSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.theme) {
                this.applyTheme(parsed.theme);
            }
            if (parsed.username) {
                setTimeout(() => {
                    const userNameEl = document.querySelector('.user-name');
                    const userRoleEl = document.querySelector('.user-role');
                    const avatarEl = document.querySelector('.avatar');
                    if (userNameEl) userNameEl.textContent = parsed.username;
                    if (userRoleEl) userRoleEl.textContent = parsed.role;
                    if (avatarEl) avatarEl.textContent = parsed.username.charAt(0).toUpperCase();
                }, 100);
            }
        }
    }

    initializeElements() {
        this.taskInput = document.getElementById('task-input');
        this.taskDescription = document.getElementById('task-description');
        this.taskCategory = document.getElementById('task-category');
        this.taskPriority = document.getElementById('task-priority');
        this.taskDeadline = document.getElementById('task-deadline');
        this.taskTime = document.getElementById('task-time');
        this.taskAssignee = document.getElementById('task-assignee');
        this.taskProject = document.getElementById('task-project');
        this.taskStatus = document.getElementById('task-status');
        this.addTaskBtn = document.getElementById('add-task-btn');
        this.tasksList = document.getElementById('tasks-list');
        this.searchInput = document.getElementById('search');
        this.categoryFilter = document.getElementById('category-filter');
        this.priorityFilter = document.getElementById('priority-filter');
        this.statusFilter = document.getElementById('status-filter');
        this.clearCompletedBtn = document.getElementById('clear-completed');
        this.exportTasksBtn = document.getElementById('export-tasks');
    }

    attachEventListeners() {
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Debounced render for search/filters (300ms delay)
        const debouncedRender = this.debounce(() => this.render(), 300, 'render');

        // Only attach listeners if elements exist
        if (this.searchInput) this.searchInput.addEventListener('input', debouncedRender);
        if (this.categoryFilter) this.categoryFilter.addEventListener('change', debouncedRender);
        if (this.priorityFilter) this.priorityFilter.addEventListener('change', debouncedRender);
        if (this.statusFilter) this.statusFilter.addEventListener('change', debouncedRender);
        if (this.clearCompletedBtn) this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        if (this.exportTasksBtn) this.exportTasksBtn.addEventListener('click', () => this.exportTasks());
    }

    addTask() {
        const title = this.taskInput.value.trim();
        if (!title) {
            this.shake(this.taskInput);
            return;
        }

        const task = {
            id: Date.now(),
            title,
            description: this.taskDescription.value.trim(),
            category: this.taskCategory.value,
            priority: this.taskPriority.value,
            deadline: this.taskDeadline.value,
            time: this.taskTime.value,
            assignee: this.taskAssignee.value.trim(),
            project: this.taskProject.value,
            status: this.taskStatus.value,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.clearInputs();
        this.render();
        this.showNotification('Task created successfully', 'success');
    }

    clearInputs() {
        this.taskInput.value = '';
        this.taskDescription.value = '';
        this.taskDeadline.value = '';
        this.taskTime.value = '';
        this.taskAssignee.value = '';
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.render();
            this.showNotification(
                task.completed ? 'Task completed' : 'Task reopened',
                task.completed ? 'success' : 'info'
            );
        }
    }

    async deleteTask(id) {
        const confirmed = await this.showConfirm('Are you sure you want to delete this task?');
        if (!confirmed) {
            return;
        }

        // Convert id to number to ensure proper comparison
        const taskId = typeof id === 'string' ? parseInt(id) : id;

        this.tasks = this.tasks.filter(t => t.id != taskId); // Use != for type coercion
        this.saveTasks();
        this.render();
        this.showNotification('Task deleted', 'info');
    }

    async clearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showNotification('No completed tasks to clear', 'info');
            return;
        }

        const confirmed = await this.showConfirm(`Delete ${completedCount} completed task(s)?`);
        if (confirmed) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.render();
            this.showNotification(`${completedCount} task(s) cleared`, 'success');
        }
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Search filter
        const searchTerm = this.searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                (task.assignee && task.assignee.toLowerCase().includes(searchTerm))
            );
        }

        // Category filter
        const categoryFilter = this.categoryFilter.value;
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(task => task.category === categoryFilter);
        }

        // Priority filter
        const priorityFilter = this.priorityFilter.value;
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(task => task.priority === priorityFilter);
        }

        // Status filter
        const statusFilter = this.statusFilter.value;
        if (statusFilter === 'active') {
            filtered = filtered.filter(task => !task.completed);
        } else if (statusFilter === 'completed') {
            filtered = filtered.filter(task => task.completed);
        }

        return filtered;
    }

    isOverdue(task) {
        if (!task.deadline || task.completed) return false;
        const deadline = new Date(task.deadline + (task.time ? ' ' + task.time : ''));
        return deadline < new Date();
    }

    formatDeadline(task) {
        if (!task.deadline) return null;

        const deadline = new Date(task.deadline + (task.time ? ' ' + task.time : ''));
        const now = new Date();
        const diff = deadline - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        const dateStr = deadline.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: deadline.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
        const timeStr = task.time ? deadline.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        }) : '';

        if (this.isOverdue(task)) {
            return `Overdue: ${dateStr}${timeStr ? ' at ' + timeStr : ''}`;
        } else if (days === 0) {
            return `Today${timeStr ? ' at ' + timeStr : ''}`;
        } else if (days === 1) {
            return `Tomorrow${timeStr ? ' at ' + timeStr : ''}`;
        } else {
            return `${dateStr}${timeStr ? ' at ' + timeStr : ''}`;
        }
    }

    getCategoryLabel(category) {
        const labels = {
            development: 'Development',
            design: 'Design',
            marketing: 'Marketing',
            sales: 'Sales',
            operations: 'Operations',
            hr: 'Human Resources'
        };
        return labels[category] || category;
    }

    getPriorityLabel(priority) {
        const labels = {
            critical: 'Critical',
            high: 'High',
            medium: 'Medium',
            low: 'Low'
        };
        return labels[priority] || priority;
    }

    renderTask(task) {
        const taskEl = document.createElement('div');
        taskEl.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority`;

        const deadlineHtml = task.deadline
            ? `<span class="task-badge badge-deadline ${this.isOverdue(task) ? 'overdue' : ''}">${this.formatDeadline(task)}</span>`
            : '';

        const assigneeHtml = task.assignee
            ? `<span class="task-badge badge-assignee">👤 ${task.assignee}</span>`
            : '';

        const projectHtml = task.project ? (() => {
            const project = this.projects.find(p => p.id == task.project);
            return project ? `<span class="task-badge badge-project" style="background: ${project.color}20; color: ${project.color}">${project.name}</span>` : '';
        })() : '';

        taskEl.innerHTML = `
            <div class="task-header">
                <div class="task-content">
                    <div class="task-title ${task.completed ? 'completed' : ''}">
                        <input type="checkbox" ${task.completed ? 'checked' : ''}
                               onchange="taskManager.toggleTask(${task.id})"
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span>${task.title}</span>
                    </div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-meta">
                        <span class="task-badge badge-category">${this.getCategoryLabel(task.category)}</span>
                        <span class="task-badge badge-priority ${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                        ${assigneeHtml}
                        ${projectHtml}
                        ${deadlineHtml}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-btn btn-complete" onclick="taskManager.toggleTask(${task.id})">
                        ${task.completed ? 'Reopen' : 'Complete'}
                    </button>
                    <button class="task-btn btn-delete" onclick="taskManager.deleteTask(${task.id})">
                        Delete
                    </button>
                </div>
            </div>
        `;

        return taskEl;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
        const overdue = this.tasks.filter(t => this.isOverdue(t)).length;

        console.log('Stats Update:');
        console.log('All tasks:', this.tasks.map(t => ({title: t.title, status: t.status, completed: t.completed})));
        console.log('Total:', total, 'Completed:', completed, 'In Progress:', inProgress, 'Overdue:', overdue);

        document.getElementById('total-tasks').textContent = total;
        document.getElementById('completed-tasks').textContent = completed;
        document.getElementById('pending-tasks').textContent = inProgress;
        document.getElementById('overdue-tasks').textContent = overdue;
    }

    render() {
        this.renderKanban();
        this.updateStats();

        // Re-render current view if needed
        if (this.currentView === 'all-tasks') {
            this.renderAllTasks();
        } else if (this.currentView === 'calendar') {
            this.renderCalendar();
        } else if (this.currentView === 'projects') {
            this.renderProjects();
        }
    }

    renderKanban() {
        const statuses = ['to-do', 'in-progress', 'review', 'qa', 'done'];

        statuses.forEach(status => {
            const column = document.getElementById(`column-${status}`);
            const count = document.getElementById(`count-${status}`);

            if (!column) return;

            const tasksInColumn = this.tasks.filter(t => (t.status || 'to-do') === status);
            count.textContent = tasksInColumn.length;

            column.innerHTML = '';

            if (tasksInColumn.length === 0) {
                column.innerHTML = '<div class="kanban-empty">No tasks</div>';
            } else {
                tasksInColumn.forEach(task => {
                    column.appendChild(this.renderKanbanCard(task));
                });
            }
        });
    }

    renderKanbanCard(task) {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.taskId = task.id;

        const projectHtml = task.project ? (() => {
            const project = this.projects.find(p => p.id == task.project);
            return project ? `<div class="kanban-card-project" style="background: ${project.color}20; color: ${project.color}; border-left: 3px solid ${project.color}">${project.name}</div>` : '';
        })() : '';

        const currentStatus = task.status || 'to-do';
        const statuses = ['to-do', 'in-progress', 'review', 'qa', 'done'];
        const currentIndex = statuses.indexOf(currentStatus);

        // Generate move buttons
        let moveButtonsHtml = '<div class="kanban-move-buttons">';
        if (currentIndex > 0) {
            moveButtonsHtml += `<button class="kanban-move-btn" onclick="event.stopPropagation(); taskManager.moveTaskToStatus(${task.id}, '${statuses[currentIndex - 1]}')">← ${this.getStatusLabel(statuses[currentIndex - 1])}</button>`;
        }
        if (currentIndex < statuses.length - 1) {
            moveButtonsHtml += `<button class="kanban-move-btn" onclick="event.stopPropagation(); taskManager.moveTaskToStatus(${task.id}, '${statuses[currentIndex + 1]}')">${this.getStatusLabel(statuses[currentIndex + 1])} →</button>`;
        }
        moveButtonsHtml += '</div>';

        card.innerHTML = `
            ${projectHtml}
            <div class="kanban-card-title">${task.title}</div>
            ${task.description ? `<div class="kanban-card-description">${task.description}</div>` : ''}
            <div class="kanban-card-meta">
                <span class="kanban-badge priority-${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                ${task.assignee ? `<span class="kanban-badge assignee">👤 ${task.assignee}</span>` : ''}
                ${task.deadline ? `<span class="kanban-badge deadline ${this.isOverdue(task) ? 'overdue' : ''}">${this.formatDeadline(task)}</span>` : ''}
            </div>
            ${moveButtonsHtml}
            <div class="kanban-card-footer">
                <span class="kanban-card-category">${this.getCategoryLabel(task.category)}</span>
                <button class="kanban-delete-btn" onclick="event.stopPropagation(); taskManager.deleteTask(${task.id})">×</button>
            </div>
        `;

        // Drag and drop handlers
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', card.innerHTML);
            e.dataTransfer.setData('taskId', task.id);
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        return card;
    }

    saveTasks() {
        localStorage.setItem('businessTasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const tasks = localStorage.getItem('businessTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Tasks exported successfully', 'success');
    }

    shake(element) {
        element.style.animation = 'shake 0.5s';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    playSound(type = 'notification') {
        // Check if sound is enabled in settings
        const settings = JSON.parse(localStorage.getItem('projexSettings') || '{}');
        if (settings.sound === false) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different sounds for different notification types
            if (type === 'success') {
                // Success: two ascending tones
                oscillator.frequency.value = 523.25; // C5
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);

                // Second tone
                setTimeout(() => {
                    const osc2 = audioContext.createOscillator();
                    const gain2 = audioContext.createGain();
                    osc2.connect(gain2);
                    gain2.connect(audioContext.destination);
                    osc2.frequency.value = 659.25; // E5
                    gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                    osc2.start();
                    osc2.stop(audioContext.currentTime + 0.15);
                }, 100);
            } else if (type === 'error') {
                // Error: descending tone
                oscillator.frequency.value = 400;
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            } else {
                // Info: single tone
                oscillator.frequency.value = 600;
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
            }
        } catch (error) {
            console.log('Sound playback not supported');
        }
    }

    showNotification(message, type = 'info') {
        // Play sound
        this.playSound(type);

        const notification = document.createElement('div');
        // Use theme colors for notifications
        const bgColor = type === 'success'
            ? 'var(--retro-tan)'
            : type === 'info'
            ? 'var(--retro-brown)'
            : 'var(--retro-dark-tan)';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${bgColor};
            color: var(--retro-cream);
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            border: 2px solid var(--retro-dark-brown);
            font-family: 'Courier New', monospace;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Custom themed confirm dialog
    showConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: var(--retro-cream);
                border: 3px solid var(--retro-dark-tan);
                border-radius: 8px;
                padding: 32px;
                max-width: 400px;
                box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.3);
                animation: scaleIn 0.2s ease;
            `;

            dialog.innerHTML = `
                <h3 style="
                    font-family: 'Courier New', monospace;
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--retro-text);
                    margin-bottom: 16px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">CONFIRM ACTION</h3>
                <p style="
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    color: var(--retro-text-light);
                    margin-bottom: 24px;
                    line-height: 1.6;
                ">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="confirm-cancel" style="
                        background: var(--retro-beige);
                        color: var(--retro-text);
                        border: 2px solid var(--retro-dark-tan);
                        padding: 10px 20px;
                        border-radius: 4px;
                        font-size: 13px;
                        font-weight: 700;
                        cursor: pointer;
                        font-family: 'Courier New', monospace;
                        box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                    ">Cancel</button>
                    <button class="confirm-ok" style="
                        background: var(--retro-tan);
                        color: var(--retro-text);
                        border: 2px solid var(--retro-dark-tan);
                        padding: 10px 20px;
                        border-radius: 4px;
                        font-size: 13px;
                        font-weight: 700;
                        cursor: pointer;
                        font-family: 'Courier New', monospace;
                        box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    ">Confirm</button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            const cleanup = () => {
                modal.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => modal.remove(), 200);
            };

            dialog.querySelector('.confirm-ok').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            dialog.querySelector('.confirm-cancel').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }

    // Project Management
    loadProjects() {
        const projects = localStorage.getItem('businessProjects');
        return projects ? JSON.parse(projects) : [];
    }

    saveProjects() {
        localStorage.setItem('businessProjects', JSON.stringify(this.projects));
    }

    addProject() {
        const name = document.getElementById('project-name').value.trim();
        if (!name) {
            this.shake(document.getElementById('project-name'));
            return;
        }

        const teamId = document.getElementById('project-team').value;

        const project = {
            id: Date.now(),
            name,
            description: document.getElementById('project-description').value.trim(),
            color: document.getElementById('project-color').value,
            status: document.getElementById('project-status').value,
            team: teamId,
            createdAt: new Date().toISOString()
        };

        this.projects.push(project);
        this.saveProjects();

        // If assigned to a team, update the team's project reference
        if (teamId) {
            const team = this.teams.find(t => t.id == teamId);
            if (team) {
                team.project = project.id;
                this.saveTeams();
            }
        }

        this.renderProjects();
        this.renderTeams();
        this.updateProjectDropdown();
        this.hideProjectForm();
        document.getElementById('project-name').value = '';
        document.getElementById('project-description').value = '';
        this.showNotification('Project created successfully', 'success');
    }

    deleteProject(id) {
        const project = this.projects.find(p => p.id === id);
        const taskCount = this.tasks.filter(t => t.project == id).length;

        if (taskCount > 0) {
            if (!confirm(`This project has ${taskCount} task(s). Delete anyway?`)) {
                return;
            }
        } else if (!confirm(`Delete project "${project.name}"?`)) {
            return;
        }

        this.projects = this.projects.filter(p => p.id !== id);
        this.tasks.forEach(t => {
            if (t.project == id) t.project = '';
        });
        this.saveProjects();
        this.saveTasks();
        this.renderProjects();
        this.updateProjectDropdown();
        this.showNotification('Project deleted', 'info');
    }

    renderProjects() {
        const projectsList = document.getElementById('projects-list');
        if (!projectsList) return;

        projectsList.innerHTML = '';

        if (this.projects.length === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <h3>No projects yet</h3>
                    <p>Create your first project to organize your tasks</p>
                </div>
            `;
            return;
        }

        this.projects.forEach(project => {
            const projectTasks = this.tasks.filter(t => t.project == project.id);
            const taskCount = projectTasks.length;
            const team = project.team ? this.teams.find(t => t.id == project.team) : null;
            const projectEl = document.createElement('div');
            projectEl.className = 'project-card';
            projectEl.innerHTML = `
                <div class="project-header">
                    <div class="project-color" style="background: ${project.color}"></div>
                    <div class="project-info">
                        <h3 class="project-name">${project.name}</h3>
                        ${project.description ? `<p class="project-description">${project.description}</p>` : ''}
                        ${team ? `<p class="project-description" style="margin-top: 4px; font-weight: 600;">👥 Team: ${team.name}</p>` : ''}
                    </div>
                    <div class="project-actions">
                        <span class="project-badge project-status-${project.status}">${project.status}</span>
                        <span class="project-badge">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
                        <button class="btn-secondary" onclick="taskManager.toggleProjectTasks(${project.id})" style="padding: 8px 16px; font-size: 13px;">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
                            </svg>
                            Add Task
                        </button>
                        <button class="task-btn btn-delete" onclick="taskManager.deleteProject(${project.id})">Delete</button>
                    </div>
                </div>
                <div class="project-tasks" id="project-tasks-${project.id}" style="display: none;">
                    <div class="project-task-form" style="padding: 20px; background: var(--gray-50); border-radius: 8px; margin-top: 16px;">
                        <div class="input-row">
                            <div class="form-group flex-1">
                                <label>Task Title</label>
                                <input type="text" id="project-task-title-${project.id}" placeholder="Enter task title...">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="form-group">
                                <label>Priority</label>
                                <select id="project-task-priority-${project.id}">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="project-task-deadline-${project.id}">
                            </div>
                            <div class="form-group">
                                <label>Assignee</label>
                                <input type="text" id="project-task-assignee-${project.id}" placeholder="Assign to...">
                            </div>
                        </div>
                        <div class="input-row">
                            <button class="btn-primary" onclick="taskManager.addTaskToProject(${project.id})">Create Task</button>
                            <button class="btn-secondary" onclick="taskManager.toggleProjectTasks(${project.id})">Cancel</button>
                        </div>
                    </div>
                    <div class="project-task-list" style="margin-top: 16px;">
                        ${this.renderProjectTasks(projectTasks)}
                    </div>
                </div>
            `;
            projectsList.appendChild(projectEl);
        });
    }

    renderProjectTasks(tasks) {
        if (tasks.length === 0) return '';

        return tasks.map(task => `
            <div class="project-task-item">
                <div class="task-title" style="display: flex; align-items: center; gap: 12px;">
                    <input type="checkbox" ${task.completed ? 'checked' : ''}
                           onchange="taskManager.toggleTask(${task.id}); taskManager.renderProjects();"
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="${task.completed ? 'text-decoration: line-through; color: var(--gray-500);' : ''}">${task.title}</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px; margin-left: 30px;">
                    <span class="task-badge badge-priority ${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                    ${task.assignee ? `<span class="task-badge badge-assignee">👤 ${task.assignee}</span>` : ''}
                    ${task.deadline ? `<span class="task-badge badge-deadline ${this.isOverdue(task) ? 'overdue' : ''}">${this.formatDeadline(task)}</span>` : ''}
                    <button class="task-btn btn-delete" onclick="taskManager.deleteTask(${task.id}); taskManager.renderProjects();" style="margin-left: auto; padding: 6px 12px; font-size: 12px;">Delete</button>
                </div>
            </div>
        `).join('');
    }

    toggleProjectTasks(projectId) {
        const tasksDiv = document.getElementById(`project-tasks-${projectId}`);
        if (tasksDiv.style.display === 'none') {
            tasksDiv.style.display = 'block';
        } else {
            tasksDiv.style.display = 'none';
            // Clear form
            document.getElementById(`project-task-title-${projectId}`).value = '';
            document.getElementById(`project-task-assignee-${projectId}`).value = '';
            document.getElementById(`project-task-deadline-${projectId}`).value = '';
        }
    }

    addTaskToProject(projectId) {
        const title = document.getElementById(`project-task-title-${projectId}`).value.trim();
        if (!title) {
            this.shake(document.getElementById(`project-task-title-${projectId}`));
            return;
        }

        const project = this.projects.find(p => p.id === projectId);

        const task = {
            id: Date.now(),
            title,
            description: '',
            category: 'development',
            priority: document.getElementById(`project-task-priority-${projectId}`).value,
            deadline: document.getElementById(`project-task-deadline-${projectId}`).value,
            time: '',
            assignee: document.getElementById(`project-task-assignee-${projectId}`).value.trim(),
            project: projectId,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderProjects();
        this.render();
        this.showNotification(`Task added to ${project.name}`, 'success');
    }

    updateProjectDropdown() {
        const dropdown = this.taskProject;
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">No Project</option>';
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            dropdown.appendChild(option);
        });
    }

    showProjectForm() {
        // Update team dropdown
        const projectTeamDropdown = document.getElementById('project-team');
        projectTeamDropdown.innerHTML = '<option value="">No Team</option>';
        this.teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            projectTeamDropdown.appendChild(option);
        });

        document.getElementById('project-form').style.display = 'block';
    }

    hideProjectForm() {
        document.getElementById('project-form').style.display = 'none';
        document.getElementById('project-name').value = '';
        document.getElementById('project-description').value = '';
    }

    // Teams Management
    loadTeams() {
        const teams = localStorage.getItem('businessTeams');
        return teams ? JSON.parse(teams) : [];
    }

    saveTeams() {
        localStorage.setItem('businessTeams', JSON.stringify(this.teams));
    }

    showTeamForm() {
        // Update project dropdown
        const teamProjectDropdown = document.getElementById('team-project');
        teamProjectDropdown.innerHTML = '<option value="">No Project</option>';
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            teamProjectDropdown.appendChild(option);
        });

        document.getElementById('team-form').style.display = 'block';
    }

    hideTeamForm() {
        document.getElementById('team-form').style.display = 'none';
        document.getElementById('team-name').value = '';
        document.getElementById('team-description').value = '';
    }

    addTeam() {
        const name = document.getElementById('team-name').value.trim();
        if (!name) {
            this.shake(document.getElementById('team-name'));
            return;
        }

        const team = {
            id: Date.now(),
            name,
            description: document.getElementById('team-description').value.trim(),
            project: document.getElementById('team-project').value,
            members: [],
            createdAt: new Date().toISOString()
        };

        this.teams.push(team);
        this.saveTeams();
        this.renderTeams();
        this.hideTeamForm();
        this.showNotification('Team created successfully', 'success');
    }

    deleteTeam(id) {
        const team = this.teams.find(t => t.id === id);
        if (!confirm(`Delete team "${team.name}"?`)) {
            return;
        }

        this.teams = this.teams.filter(t => t.id !== id);
        this.saveTeams();
        this.renderTeams();
        this.showNotification('Team deleted', 'info');
    }

    renderTeams() {
        const teamsList = document.getElementById('teams-list');
        if (!teamsList) return;

        teamsList.innerHTML = '';

        if (this.teams.length === 0) {
            teamsList.innerHTML = `
                <div class="empty-state">
                    <h3>No teams yet</h3>
                    <p>Create your first team to organize your members</p>
                </div>
            `;
            return;
        }

        this.teams.forEach(team => {
            const project = team.project ? this.projects.find(p => p.id == team.project) : null;
            const teamEl = document.createElement('div');
            teamEl.className = 'project-card';
            teamEl.innerHTML = `
                <div class="project-header">
                    <div class="project-color" style="background: var(--retro-blue)"></div>
                    <div class="project-info">
                        <h3 class="project-name">${team.name}</h3>
                        ${team.description ? `<p class="project-description">${team.description}</p>` : ''}
                        ${project ? `<p class="project-description" style="margin-top: 4px; font-weight: 600;">📁 Project: ${project.name}</p>` : ''}
                    </div>
                    <div class="project-actions">
                        <span class="project-badge">${team.members.length} member${team.members.length !== 1 ? 's' : ''}</span>
                        <button class="project-action-btn" onclick="taskManager.deleteTeam(${team.id})" title="Delete Team">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="project-tasks" id="team-members-${team.id}" style="display: block;">
                    <div style="padding: 16px; background: var(--retro-beige); border-top: 2px solid var(--retro-dark-tan);">
                        <div style="margin-bottom: 12px;">
                            <input type="text" id="team-member-name-${team.id}" placeholder="Member name..." style="width: 200px; padding: 8px; border: 2px solid var(--retro-dark-tan); background: var(--retro-cream); font-family: 'Courier New', monospace;">
                            <input type="text" id="team-member-role-${team.id}" placeholder="Role..." style="width: 150px; padding: 8px; border: 2px solid var(--retro-dark-tan); background: var(--retro-cream); font-family: 'Courier New', monospace; margin-left: 8px;">
                            <button class="btn-primary" onclick="taskManager.addTeamMember(${team.id})" style="margin-left: 8px; padding: 8px 16px;">Add Member</button>
                        </div>
                        ${this.renderTeamMembers(team)}
                    </div>
                </div>
            `;
            teamsList.appendChild(teamEl);
        });
    }

    renderTeamMembers(team) {
        if (team.members.length === 0) {
            return '<p style="color: var(--retro-text-light); font-style: italic; margin: 0;">No members yet</p>';
        }

        return team.members.map(member => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--retro-cream); border: 2px solid var(--retro-dark-tan); margin-bottom: 8px; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">${member.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight: 700;">${member.name}</div>
                        <div style="font-size: 12px; color: var(--retro-text-light);">${member.role}</div>
                    </div>
                </div>
                <button class="task-btn btn-delete" onclick="taskManager.removeTeamMember(${team.id}, ${member.id})" style="padding: 6px 12px; font-size: 12px;">Remove</button>
            </div>
        `).join('');
    }

    addTeamMember(teamId) {
        const nameInput = document.getElementById(`team-member-name-${teamId}`);
        const roleInput = document.getElementById(`team-member-role-${teamId}`);
        const name = nameInput.value.trim();
        const role = roleInput.value.trim() || 'Member';

        if (!name) {
            this.shake(nameInput);
            return;
        }

        const team = this.teams.find(t => t.id === teamId);
        const member = {
            id: Date.now(),
            name,
            role
        };

        team.members.push(member);
        this.saveTeams();
        this.renderTeams();
        this.showNotification(`${name} added to ${team.name}`, 'success');
    }

    removeTeamMember(teamId, memberId) {
        const team = this.teams.find(t => t.id === teamId);
        team.members = team.members.filter(m => m.id !== memberId);
        this.saveTeams();
        this.renderTeams();
        this.showNotification('Member removed', 'info');
    }

    switchView(view) {
        this.currentView = view;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Hide all sections
        document.getElementById('tasks-section').style.display = 'none';
        document.getElementById('all-tasks-section').style.display = 'none';
        document.getElementById('calendar-section').style.display = 'none';
        document.getElementById('projects-section').style.display = 'none';
        document.getElementById('teams-section').style.display = 'none';

        if (view === 'dashboard') {
            document.querySelectorAll('.nav-item')[0].classList.add('active');
            document.getElementById('tasks-section').style.display = 'block';
        } else if (view === 'all-tasks') {
            document.querySelectorAll('.nav-item')[1].classList.add('active');
            document.getElementById('all-tasks-section').style.display = 'block';
            this.renderAllTasks();
        } else if (view === 'calendar') {
            document.querySelectorAll('.nav-item')[2].classList.add('active');
            document.getElementById('calendar-section').style.display = 'block';
            this.renderCalendar();
        } else if (view === 'projects') {
            document.querySelectorAll('.nav-item')[3].classList.add('active');
            document.getElementById('projects-section').style.display = 'block';
            this.renderProjects();
        } else if (view === 'teams') {
            document.querySelectorAll('.nav-item')[4].classList.add('active');
            document.getElementById('teams-section').style.display = 'block';
            this.renderTeams();
        }
    }

    async goToLanding() {
        // Confirm before going back
        const confirmed = await this.showConfirm('Return to landing page? You will remain logged in.');
        if (confirmed) {
            document.getElementById('main-app').style.display = 'none';
            document.getElementById('landing-page').style.display = 'block';
        }
    }

    applyGuestRestrictions() {
        // Check if user is a guest
        const user = JSON.parse(localStorage.getItem('projexUser') || '{}');
        if (!user.isGuest) return;

        // Update user profile to show "Guest"
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const avatarEl = document.querySelector('.avatar');
        if (userNameEl) userNameEl.textContent = 'Guest';
        if (userRoleEl) userRoleEl.textContent = 'Visitor';
        if (avatarEl) avatarEl.textContent = 'G';

        // Disable Projects and Teams navigation items and add padlock icons
        const navItems = document.querySelectorAll('.nav-item');

        // Projects (4th nav item, index 3)
        if (navItems[3]) {
            navItems[3].style.opacity = '0.5';
            navItems[3].style.cursor = 'not-allowed';
            navItems[3].style.pointerEvents = 'none';

            // Add padlock icon
            const projectsSpan = navItems[3].querySelector('span');
            if (projectsSpan && !projectsSpan.querySelector('.padlock-icon')) {
                projectsSpan.innerHTML = 'Projects <span class="padlock-icon">🔒</span>';
            }
        }

        // Teams (5th nav item, index 4)
        if (navItems[4]) {
            navItems[4].style.opacity = '0.5';
            navItems[4].style.cursor = 'not-allowed';
            navItems[4].style.pointerEvents = 'none';

            // Add padlock icon
            const teamsSpan = navItems[4].querySelector('span');
            if (teamsSpan && !teamsSpan.querySelector('.padlock-icon')) {
                teamsSpan.innerHTML = 'Teams <span class="padlock-icon">🔒</span>';
            }
        }

        // Hide Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.style.display = 'none';
        }

        // Set guest flag to disable username editing
        this.isGuest = true;
    }

    // All Tasks View
    renderAllTasks() {
        const allTasksList = document.getElementById('all-tasks-list');
        if (!allTasksList) return;

        // Update project filter dropdown
        const projectFilter = document.getElementById('all-tasks-project-filter');
        projectFilter.innerHTML = '<option value="all">All Projects</option>';
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectFilter.appendChild(option);
        });

        // Attach filter listeners with debouncing
        const searchInput = document.getElementById('all-tasks-search');
        const priorityFilter = document.getElementById('all-tasks-priority-filter');
        const statusFilter = document.getElementById('all-tasks-status-filter');

        // Only attach listeners once
        if (!this.allTasksListenersAttached) {
            const debouncedAllTasksRender = this.debounce(() => this.renderAllTasks(), 300, 'allTasks');
            searchInput.addEventListener('input', debouncedAllTasksRender);
            projectFilter.addEventListener('change', debouncedAllTasksRender);
            priorityFilter.addEventListener('change', debouncedAllTasksRender);
            statusFilter.addEventListener('change', debouncedAllTasksRender);
            this.allTasksListenersAttached = true;
        }

        // Filter tasks
        let filteredTasks = [...this.tasks];

        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm)
            );
        }

        const projectFilterVal = projectFilter.value;
        if (projectFilterVal !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.project == projectFilterVal);
        }

        const priorityFilterVal = priorityFilter.value;
        if (priorityFilterVal !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === priorityFilterVal);
        }

        const statusFilterVal = statusFilter.value;
        if (statusFilterVal === 'active') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (statusFilterVal === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }

        // Render tasks
        allTasksList.innerHTML = '';
        if (filteredTasks.length === 0) {
            allTasksList.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            `;
        } else {
            filteredTasks.forEach(task => {
                allTasksList.appendChild(this.renderTask(task));
            });
        }
    }

    // Calendar View
    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYearEl = document.getElementById('calendar-month-year');

        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();

        monthYearEl.textContent = this.calendarDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = '<div class="calendar-grid-container">';

        // Day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days with tasks and sticky notes
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayTasks = this.tasks.filter(t => t.deadline === dateStr);
            const dayNotes = this.getStickyNotes(dateStr);

            const isToday = new Date().toDateString() === date.toDateString();
            const hasOverdue = dayTasks.some(t => this.isOverdue(t));

            html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasOverdue ? 'has-overdue' : ''}" onclick="taskManager.showStickyNoteForm('${dateStr}')">`;
            html += `<div class="calendar-day-number">${day}</div>`;

            // Sticky notes
            if (dayNotes.length > 0) {
                html += '<div class="calendar-sticky-notes">';
                dayNotes.forEach(note => {
                    html += `
                        <div class="calendar-sticky-note" onclick="event.stopPropagation(); taskManager.editStickyNote('${note.id}', '${dateStr}')" style="background: ${note.color || '#fff8dc'}">
                            <div class="sticky-note-text">${note.text}</div>
                            <button class="sticky-note-delete" onclick="event.stopPropagation(); taskManager.deleteStickyNote('${note.id}')">×</button>
                        </div>
                    `;
                });
                html += '</div>';
            }

            if (dayTasks.length > 0) {
                html += '<div class="calendar-tasks">';
                dayTasks.slice(0, 2).forEach(task => {
                    html += `
                        <div class="calendar-task ${task.completed ? 'completed' : ''} priority-${task.priority}">
                            <span class="calendar-task-title">${task.title}</span>
                        </div>
                    `;
                });
                if (dayTasks.length > 2) {
                    html += `<div class="calendar-task-more">+${dayTasks.length - 2} more</div>`;
                }
                html += '</div>';
            }

            html += '</div>';
        }

        html += '</div>';
        calendarGrid.innerHTML = html;
    }

    changeCalendarView(direction) {
        if (direction === 'prev') {
            this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
        } else {
            this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
        }
        this.renderCalendar();
    }

    goToToday() {
        this.calendarDate = new Date();
        this.renderCalendar();
    }

    // Kanban Board Drag and Drop
    initializeKanban() {
        const statuses = ['to-do', 'in-progress', 'review', 'qa', 'done'];

        statuses.forEach(status => {
            const column = document.getElementById(`column-${status}`);
            if (!column) return;

            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');

                const taskId = parseInt(e.dataTransfer.getData('taskId'));
                const task = this.tasks.find(t => t.id === taskId);

                if (task) {
                    task.status = status;
                    if (status === 'done') {
                        task.completed = true;
                    } else {
                        task.completed = false;
                    }
                    this.saveTasks();
                    this.render();
                    this.showNotification(`Task moved to ${this.getStatusLabel(status)}`, 'success');
                }
            });
        });
    }

    getStatusLabel(status) {
        const labels = {
            'to-do': 'To Do',
            'in-progress': 'In Progress',
            'review': 'In Review',
            'qa': 'QA',
            'done': 'Done'
        };
        return labels[status] || status;
    }

    moveTaskToStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            if (newStatus === 'done') {
                task.completed = true;
            } else {
                task.completed = false;
            }
            this.saveTasks();
            this.render();
            this.showNotification(`Task moved to ${this.getStatusLabel(newStatus)}`, 'success');
        }
    }

    showKanbanTaskForm(status) {
        const column = document.getElementById(`column-${status}`);

        // Remove any existing forms first
        const existingForm = column.querySelector('.kanban-task-form');
        if (existingForm) {
            existingForm.remove();
            return;
        }

        const formId = `kanban-form-${status}`;
        const form = document.createElement('div');
        form.className = 'kanban-task-form';
        form.id = formId;
        form.innerHTML = `
            <input type="text" id="${formId}-title" placeholder="Task title..." />
            <input type="text" id="${formId}-assignee" placeholder="Assignee..." />
            <select id="${formId}-priority">
                <option value="low">Low Priority</option>
                <option value="medium" selected>Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
            </select>
            <input type="date" id="${formId}-deadline" />
            <div class="kanban-task-form-buttons">
                <button onclick="taskManager.addKanbanTask('${status}')" style="background: var(--retro-tan); color: var(--retro-text);">Add</button>
                <button onclick="taskManager.hideKanbanTaskForm('${status}')" style="background: var(--retro-beige); color: var(--retro-text);">Cancel</button>
            </div>
        `;

        column.insertBefore(form, column.firstChild);
        document.getElementById(`${formId}-title`).focus();
    }

    hideKanbanTaskForm(status) {
        const column = document.getElementById(`column-${status}`);
        const form = column.querySelector('.kanban-task-form');
        if (form) form.remove();
    }

    addKanbanTask(status) {
        const formId = `kanban-form-${status}`;
        const title = document.getElementById(`${formId}-title`).value.trim();

        if (!title) {
            this.shake(document.getElementById(`${formId}-title`));
            return;
        }

        console.log('Creating task with status:', status);

        const task = {
            id: Date.now(),
            title,
            description: '',
            category: 'development',
            priority: document.getElementById(`${formId}-priority`).value,
            deadline: document.getElementById(`${formId}-deadline`).value,
            time: '',
            assignee: document.getElementById(`${formId}-assignee`).value.trim(),
            project: '',
            status: status,
            completed: status === 'done',
            createdAt: new Date().toISOString()
        };

        console.log('Task object created:', task);

        this.tasks.unshift(task);
        this.saveTasks();
        this.hideKanbanTaskForm(status);
        this.render();
        this.showNotification(`Task created in ${this.getStatusLabel(status)}`, 'success');
    }

    // Sticky Notes Management
    loadStickyNotes() {
        const notes = localStorage.getItem('businessStickyNotes');
        return notes ? JSON.parse(notes) : {};
    }

    saveStickyNotes() {
        localStorage.setItem('businessStickyNotes', JSON.stringify(this.stickyNotes));
    }

    getStickyNotes(date) {
        return this.stickyNotes[date] || [];
    }

    showStickyNoteForm(date) {
        const modal = document.createElement('div');
        modal.className = 'sticky-note-modal';
        modal.innerHTML = `
            <div class="sticky-note-modal-content">
                <h3 class="sticky-note-modal-title">ADD STICKY NOTE</h3>
                <p class="sticky-note-date">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <textarea id="sticky-note-text" placeholder="Write your note here..." rows="5"></textarea>
                <div class="sticky-note-color-picker">
                    <label>Color:</label>
                    <div class="color-options">
                        <div class="color-option" data-color="#fff8dc" style="background: #fff8dc"></div>
                        <div class="color-option" data-color="#ffe4b5" style="background: #ffe4b5"></div>
                        <div class="color-option" data-color="#ffd4a3" style="background: #ffd4a3"></div>
                        <div class="color-option" data-color="#ffb6c1" style="background: #ffb6c1"></div>
                        <div class="color-option" data-color="#b0e0e6" style="background: #b0e0e6"></div>
                        <div class="color-option" data-color="#98fb98" style="background: #98fb98"></div>
                    </div>
                </div>
                <input type="hidden" id="sticky-note-color" value="#fff8dc" />
                <input type="hidden" id="sticky-note-date" value="${date}" />
                <input type="hidden" id="sticky-note-id" value="" />
                <div class="sticky-note-modal-buttons">
                    <button class="btn-primary" onclick="taskManager.saveStickyNote()">Save Note</button>
                    <button class="btn-secondary" onclick="taskManager.closeStickyNoteModal()">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Color picker functionality
        modal.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', function() {
                modal.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('sticky-note-color').value = this.dataset.color;
            });
        });

        // Select first color by default
        modal.querySelector('.color-option').classList.add('selected');

        // Focus on textarea
        setTimeout(() => document.getElementById('sticky-note-text').focus(), 100);
    }

    editStickyNote(noteId, date) {
        const notes = this.getStickyNotes(date);
        const note = notes.find(n => n.id == noteId);
        if (!note) return;

        this.showStickyNoteForm(date);
        setTimeout(() => {
            document.getElementById('sticky-note-text').value = note.text;
            document.getElementById('sticky-note-color').value = note.color;
            document.getElementById('sticky-note-id').value = note.id;

            // Select the correct color
            const colorOption = document.querySelector(`.color-option[data-color="${note.color}"]`);
            if (colorOption) {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                colorOption.classList.add('selected');
            }
        }, 100);
    }

    saveStickyNote() {
        const text = document.getElementById('sticky-note-text').value.trim();
        const color = document.getElementById('sticky-note-color').value;
        const date = document.getElementById('sticky-note-date').value;
        const noteId = document.getElementById('sticky-note-id').value;

        if (!text) {
            this.shake(document.getElementById('sticky-note-text'));
            return;
        }

        if (!this.stickyNotes[date]) {
            this.stickyNotes[date] = [];
        }

        if (noteId) {
            // Update existing note
            const noteIndex = this.stickyNotes[date].findIndex(n => n.id == noteId);
            if (noteIndex !== -1) {
                this.stickyNotes[date][noteIndex].text = text;
                this.stickyNotes[date][noteIndex].color = color;
            }
        } else {
            // Create new note
            const note = {
                id: Date.now().toString(),
                text,
                color,
                createdAt: new Date().toISOString()
            };
            this.stickyNotes[date].push(note);
        }

        this.saveStickyNotes();
        this.closeStickyNoteModal();
        this.renderCalendar();
        this.showNotification('Sticky note saved', 'success');
    }

    deleteStickyNote(noteId) {
        if (!confirm('Delete this sticky note?')) return;

        for (const date in this.stickyNotes) {
            this.stickyNotes[date] = this.stickyNotes[date].filter(n => n.id != noteId);
            if (this.stickyNotes[date].length === 0) {
                delete this.stickyNotes[date];
            }
        }

        this.saveStickyNotes();
        this.renderCalendar();
        this.showNotification('Sticky note deleted', 'info');
    }

    closeStickyNoteModal() {
        const modal = document.querySelector('.sticky-note-modal');
        if (modal) modal.remove();
    }

    // Settings Modal
    showSettings() {
        // Check if guest
        if (this.isGuest) {
            this.showNotification('Settings are not available for guest users', 'error');
            return;
        }

        // Load current settings
        const settings = JSON.parse(localStorage.getItem('projexSettings') || '{}');
        const currentUsername = settings.username || 'Administrator';
        const currentRole = settings.role || 'Project Manager';
        const currentTheme = settings.theme || 'dark';
        const currentNotifications = settings.notifications !== undefined ? settings.notifications : true;
        const currentSound = settings.sound !== undefined ? settings.sound : true;

        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-modal-content">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <button class="settings-close" onclick="taskManager.closeSettings()">×</button>
                </div>
                <div class="settings-body">
                    <div class="settings-section">
                        <h3>Account</h3>
                        <div class="settings-item">
                            <label>User Name</label>
                            <input type="text" value="${currentUsername}" id="settings-username">
                        </div>
                        <div class="settings-item">
                            <label>Role</label>
                            <input type="text" value="${currentRole}" id="settings-role">
                        </div>
                    </div>
                    <div class="settings-section">
                        <h3>Preferences</h3>
                        <div class="settings-item">
                            <label>Theme Mode</label>
                            <div class="theme-toggle" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <button class="theme-btn ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" onclick="taskManager.previewTheme('light')">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
                                    </svg>
                                    Light
                                </button>
                                <button class="theme-btn ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" onclick="taskManager.previewTheme('dark')">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                                    </svg>
                                    Dark
                                </button>
                                <button class="theme-btn ${currentTheme === 'office' ? 'active' : ''}" data-theme="office" onclick="taskManager.previewTheme('office')">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                                    </svg>
                                    Office
                                </button>
                                <button class="theme-btn ${currentTheme === 'home' ? 'active' : ''}" data-theme="home" onclick="taskManager.previewTheme('home')">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
                                    </svg>
                                    Home
                                </button>
                            </div>
                        </div>
                        <div class="settings-item">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settings-notifications" ${currentNotifications ? 'checked' : ''}>
                                <span>Enable Notifications</span>
                            </label>
                        </div>
                        <div class="settings-item">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settings-sound" ${currentSound ? 'checked' : ''}>
                                <span>Sound Effects</span>
                            </label>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h3>Data Management</h3>
                        <div class="settings-item">
                            <button class="btn-secondary" onclick="taskManager.exportAllData()">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/>
                                </svg>
                                Export All Data
                            </button>
                        </div>
                        <div class="settings-item">
                            <button class="btn-secondary" onclick="taskManager.clearAllData()" style="color: var(--retro-red); border-color: var(--retro-red);">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                                </svg>
                                Clear All Data
                            </button>
                        </div>
                    </div>
                </div>
                <div class="settings-footer">
                    <button class="btn-primary" onclick="taskManager.saveSettings()">Save Settings</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    closeSettings() {
        const modal = document.querySelector('.settings-modal');
        if (modal) modal.remove();
    }

    previewTheme(theme) {
        // Update active button
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });

        // Apply theme
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        const root = document.documentElement;

        if (theme === 'light') {
            // Light theme colors
            root.style.setProperty('--retro-brown', '#d4a574');
            root.style.setProperty('--retro-dark-brown', '#b8916a');
            root.style.setProperty('--retro-darker-brown', '#a0826d');
            root.style.setProperty('--retro-tan', '#e8c4a0');
            root.style.setProperty('--retro-dark-tan', '#d4a574');
            root.style.setProperty('--retro-cream', '#ffffff');
            root.style.setProperty('--retro-beige', '#f5f5f0');
            root.style.setProperty('--retro-light-beige', '#ffffff');
            root.style.setProperty('--retro-paper', '#fafaf8');
            root.style.setProperty('--retro-text', '#2c1810');
            root.style.setProperty('--retro-text-light', '#5a4a3a');

            document.body.style.background = 'linear-gradient(135deg, #f5f5f0 0%, #e8dcc8 100%)';
        } else if (theme === 'office') {
            // Office theme - professional blues and grays
            root.style.setProperty('--retro-brown', '#5a7c99');
            root.style.setProperty('--retro-dark-brown', '#3d5a73');
            root.style.setProperty('--retro-darker-brown', '#2a3f52');
            root.style.setProperty('--retro-tan', '#7b9eb8');
            root.style.setProperty('--retro-dark-tan', '#628aa3');
            root.style.setProperty('--retro-cream', '#f0f4f8');
            root.style.setProperty('--retro-beige', '#e3ebf2');
            root.style.setProperty('--retro-light-beige', '#f5f8fb');
            root.style.setProperty('--retro-paper', '#f8fafc');
            root.style.setProperty('--retro-text', '#1e293b');
            root.style.setProperty('--retro-text-light', '#475569');

            document.body.style.background = 'linear-gradient(135deg, #e3ebf2 0%, #cbd5e1 100%)';
        } else if (theme === 'home') {
            // Home theme - warm cozy colors (terracotta, sage, cream)
            root.style.setProperty('--retro-brown', '#b5705f');
            root.style.setProperty('--retro-dark-brown', '#9a5646');
            root.style.setProperty('--retro-darker-brown', '#7a4133');
            root.style.setProperty('--retro-tan', '#d4a190');
            root.style.setProperty('--retro-dark-tan', '#c48b7a');
            root.style.setProperty('--retro-cream', '#faf7f2');
            root.style.setProperty('--retro-beige', '#f0e8dc');
            root.style.setProperty('--retro-light-beige', '#fdfbf7');
            root.style.setProperty('--retro-paper', '#f9f5ef');
            root.style.setProperty('--retro-text', '#3e2723');
            root.style.setProperty('--retro-text-light', '#6d4c41');

            document.body.style.background = 'linear-gradient(135deg, #f0e8dc 0%, #e8d5c4 100%)';
        } else {
            // Dark theme (original retro colors)
            root.style.setProperty('--retro-brown', '#8b7355');
            root.style.setProperty('--retro-dark-brown', '#6b5744');
            root.style.setProperty('--retro-darker-brown', '#4a3829');
            root.style.setProperty('--retro-tan', '#d4a574');
            root.style.setProperty('--retro-dark-tan', '#b8916a');
            root.style.setProperty('--retro-cream', '#f5f5dc');
            root.style.setProperty('--retro-beige', '#e8dcc8');
            root.style.setProperty('--retro-light-beige', '#fff8dc');
            root.style.setProperty('--retro-paper', '#ebe8d8');
            root.style.setProperty('--retro-text', '#3a2817');
            root.style.setProperty('--retro-text-light', '#5a4a3a');

            document.body.style.background = 'linear-gradient(135deg, #e8dcc8 0%, #d4c4a8 100%)';
        }
    }

    saveSettings() {
        const username = document.getElementById('settings-username').value;
        const role = document.getElementById('settings-role').value;
        const theme = document.querySelector('.theme-btn.active').dataset.theme;

        // Update user profile in sidebar
        document.querySelector('.user-name').textContent = username;
        document.querySelector('.user-role').textContent = role;
        document.querySelector('.avatar').textContent = username.charAt(0).toUpperCase();

        // Save to localStorage
        localStorage.setItem('projexSettings', JSON.stringify({
            username,
            role,
            theme,
            notifications: document.getElementById('settings-notifications').checked,
            sound: document.getElementById('settings-sound').checked
        }));

        this.showNotification('Settings saved successfully', 'success');
        this.closeSettings();
    }

    exportAllData() {
        const data = {
            tasks: this.tasks,
            projects: this.projects,
            teams: this.teams,
            stickyNotes: this.stickyNotes,
            settings: JSON.parse(localStorage.getItem('projexSettings') || '{}'),
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `projex-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully', 'success');
    }

    clearAllData() {
        if (!confirm('⚠️ WARNING: This will delete ALL tasks, projects, teams, and sticky notes. This cannot be undone!\n\nAre you absolutely sure?')) {
            return;
        }

        localStorage.removeItem('businessTasks');
        localStorage.removeItem('businessProjects');
        localStorage.removeItem('businessTeams');
        localStorage.removeItem('businessStickyNotes');

        this.tasks = [];
        this.projects = [];
        this.teams = [];
        this.stickyNotes = {};

        this.render();
        this.renderProjects();
        this.renderTeams();
        this.closeSettings();
        this.showNotification('All data cleared', 'info');
    }
}

// Initialize the app
const taskManager = new TaskManager();

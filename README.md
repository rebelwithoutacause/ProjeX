# ProjeX - Task & Project Management

A modern, feature-rich task management application with a beautiful retro-themed interface. ProjeX helps individuals and teams organize tasks, manage projects, and boost productivity with an intuitive design and powerful features.

![ProjeX Banner](https://img.shields.io/badge/ProjeX-Task%20Management-8b7355?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=flat-square)

## ✨ Features

### 📋 Task Management
- **Multiple Views**: Dashboard, Kanban Board, Calendar, and List views
- **Task Organization**: Create, edit, delete, and manage tasks with ease
- **Priority Levels**: Set task priorities (Low, Medium, High)
- **Project Assignment**: Organize tasks by projects
- **Team Collaboration**: Assign tasks to team members
- **Smart Filtering**: Filter by status, priority, project, and team
- **Search Functionality**: Quickly find tasks with powerful search

### 🎨 Themes
- **Retro Theme** (Default): Warm brown and tan colors
- **Office Theme**: Professional blue tones
- **Light Mode**: Clean and bright
- **Dark Mode**: Easy on the eyes
- All themes dynamically adapt across the entire interface

### 📊 Views & Visualization
- **Dashboard**: Overview of all tasks with statistics
- **Kanban Board**: Visual task management with drag-and-drop columns (To Do, In Progress, Completed)
- **Calendar View**: See tasks organized by date
- **List View**: Traditional task list with sorting options

### 🔔 Notifications & Sound
- **Themed Notifications**: Color-coded alerts matching your selected theme
- **Sound Effects**: Retro beep sounds for actions (can be toggled in settings)
- **Custom Confirmations**: Beautiful themed confirmation dialogs

### 👥 User Management
- **Email Registration & Login**: Secure user accounts
- **Demo Mode**: Try the app without registration
- **User Profiles**: Personalized experience with username and role display
- **Settings Persistence**: Your preferences are saved locally

### 📌 Additional Features
- **Sticky Notes**: Quick notes with color coding (yellow, pink, blue, green)
- **Project Management**: Create and manage multiple projects
- **Team Management**: Build teams and assign members
- **Local Storage**: All data persists in your browser
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Optional: Node.js and npm for running a local server

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/projex.git
   cd projex
   ```

2. **Install dependencies** (optional)
   ```bash
   npm install
   ```

3. **Run the application**

   **Option 1: Using npm**
   ```bash
   npm start
   ```
   This will start a live server at `http://localhost:8080`

   **Option 2: Direct file access**
   Simply open `index.html` in your web browser

## 🎯 How to Use

### First Time Setup
1. Open the application to see the landing page
2. Choose to **Register**, **Login**, or try **Demo Mode**
3. After login, you'll see the main dashboard

### Creating Tasks
1. Click the **+ New Task** button
2. Fill in task details (title, description, priority, due date)
3. Optionally assign to a project or team member
4. Click **Add Task**

### Managing Views
- Use the navigation menu to switch between Dashboard, Kanban, Calendar, and List views
- Each view offers unique ways to visualize and interact with your tasks

### Customizing Themes
1. Click the **Settings** icon (⚙️)
2. Select your preferred theme from the dropdown
3. Toggle sound effects on/off
4. Click **Save Settings**

### Projects & Teams
- Click **Projects** or **Teams** in the navigation
- Create new projects/teams with the + button
- Edit or delete existing ones

## 🛠️ Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables, flexbox, and animations
- **JavaScript (ES6+)**: Vanilla JS with classes and modules
- **LocalStorage API**: Data persistence
- **Web Audio API**: Sound effects
- **Date-fns** (optional): Date manipulation

## 📁 Project Structure

```
projex/
├── index.html              # Main HTML file
├── app.js                  # Core application logic
├── auth.js                 # Authentication and landing page
├── style.css               # Main stylesheet
├── retro-override.css      # Retro theme overrides
├── intro.css               # Landing page styles
├── package.json            # Project metadata
├── OAUTH_SETUP.md          # OAuth setup documentation
└── README.md               # This file
```

## 🎨 Customization

### Adding New Themes
1. Define CSS variables in your stylesheet
2. Add theme option to settings in `app.js`
3. Update `applyTheme()` function to handle new theme

### Modifying Sound Effects
Edit the `playSound()` function in `app.js` to customize frequencies and durations.

## 🔒 Privacy & Security

- All data is stored locally in your browser's LocalStorage
- No data is sent to external servers
- Passwords are stored in plain text in LocalStorage (for demo purposes only)
- **Note**: For production use, implement proper backend authentication

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- LocalStorage has storage limits (~5-10MB depending on browser)
- No backend means no data sync across devices
- Password storage is not secure (demonstration purposes only)

## 🚀 Future Enhancements

- [ ] Backend integration with database
- [ ] Real-time collaboration
- [ ] File attachments for tasks
- [ ] Task dependencies and subtasks
- [ ] Export/Import functionality
- [ ] Mobile app version
- [ ] Email notifications
- [ ] Time tracking

## 💡 Tips

- Use **Kanban view** for visual task management
- Set **priorities** to focus on important tasks
- Use **projects** to organize related tasks
- Enable **sound effects** for audio feedback
- Try different **themes** to match your mood

## 📧 Contact

For questions, suggestions, or issues, please open an issue on GitHub.

---

**Built with ❤️ for productivity enthusiasts**

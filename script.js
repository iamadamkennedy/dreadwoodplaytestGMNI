document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0; // 0-based index for player being set up
    let playerData = []; // Array to hold { name: 'P1', class: null } objects
    let selectedClasses = []; // Keep track of classes chosen so far in setup

    // --- DOM Element References ---
    const screens = {
        playerCount: document.getElementById('screen-player-count'),
        playerSetup: document.getElementById('screen-player-setup'),
        gameplay: document.getElementById('screen-gameplay'), // For later
    };
    const popups = {
       elimination: document.getElementById('popup-elimination'), // For later
       victory: document.getElementById('popup-victory'), // For later
    }

    // Player Count Screen Elements
    const playerCountButtons = screens.playerCount.querySelectorAll('button[data-count]');

    // Player Setup Screen Elements
    const playerSetupTitle = document.getElementById('player-setup-title');
    const playerNameLabel = document.getElementById('player-name-label');
    const playerNameInput = document.getElementById('input-player-name');
    const classSelectionContainer = document.getElementById('class-selection-buttons');
    const classButtons = classSelectionContainer.querySelectorAll('.btn-class');
    const classDetailsName = document.getElementById('class-name');
    const classDetailsDescription = document.getElementById('class-description');
    const classDetailsAbilities = document.getElementById('class-abilities');
    const classDetailsContainer = document.getElementById('class-details-container');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');

    // Stub/Temp Elements
    const btnRestartStub = document.getElementById('btn-restart-stub'); // Temp button on gameplay screen

    // --- Class Data (Hardcoded for now) ---
    const CLASS_DATA = {
        "Sheriff": {
            description: "A faction of Vampires enforcing order in a chaotic frontier.",
            abilities: ["Under My Protection (Passive)", "Swift Justice (Passive)", "Order Restored (Active, 1/game)"]
        },
        "Vigilante": {
            description: "A faction of Vampires seeking justice, using teamwork to punish wrongdoers.",
            abilities: ["Side by Side (Passive)", "Blood Brothers (Passive)", "Vengeance is Mine (Active, 1/game)"]
        },
        "Outlaw": {
            description: "A faction of Vampires thriving on chaos, disrupting and escaping with speed.",
            abilities: ["Daring Escape (Passive)", "Hand Cannon (Active, 1/game)", "Rampage (Active, 1/game)"]
        },
        "Bounty Hunter": {
            description: "A faction of Vampires hunting for profit, using precision to eliminate targets.",
            abilities: ["Sharpshooter (Passive)", "Marked Man (Passive)", "Contract Payoff (Active, 1/game)"]
        }
        // Add other classes if needed
    };

    // --- Helper Functions ---
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenId].classList.add('active');
        console.log(`Showing screen: ${screenId}`);
    }

    function displayClassDetails(className) {
        const data = CLASS_DATA[className];
        if (data) {
            classDetailsName.innerHTML = `<strong>Class:</strong> ${className}`;
            classDetailsDescription.textContent = data.description;
            classDetailsAbilities.innerHTML = ''; // Clear previous abilities
            data.abilities.forEach(ability => {
                const li = document.createElement('li');
                li.textContent = ability;
                classDetailsAbilities.appendChild(li);
            });
            classDetailsContainer.style.display = 'block'; // Show details
        } else {
            classDetailsName.innerHTML = `<strong>Class:</strong> ---`;
            classDetailsDescription.textContent = 'Select a class above to see details.';
            classDetailsAbilities.innerHTML = '<li>---</li>';
        }
    }

    function updatePlayerSetupScreen(playerIndex) {
        const playerNum = playerIndex + 1;
        currentPlayerSetupIndex = playerIndex; // Update global state tracker

        console.log(`Setting up screen for Player ${playerNum}`);

        // Reset temporary selections for the new player
        playerData[playerIndex] = { name: `P${playerNum}`, class: null }; // Initialize/reset player data slot
        playerNameInput.value = ''; // Clear previous name input
        playerNameInput.placeholder = `P${playerNum} Name (Optional)`;


        // Update titles and labels
        playerSetupTitle.textContent = `Player ${playerNum} Setup`;
        playerNameLabel.textContent = `Player ${playerNum} Name:`;


        // Reset and update class buttons
        let previouslySelectedButton = classSelectionContainer.querySelector('.selected');
        if (previouslySelectedButton) {
            previouslySelectedButton.classList.remove('selected');
        }
        classButtons.forEach(button => {
            const className = button.dataset.class;
            // Disable button if class was selected by a *previous* player
            if (selectedClasses.includes(className)) {
                button.disabled = true;
                button.style.opacity = '0.5'; // Visually indicate disabled
            } else {
                button.disabled = false;
                button.style.opacity = '1';
            }
        });

        // Reset class details display
        displayClassDetails(null);

        // Update navigation buttons
        btnBack.style.display = (playerIndex === 0) ? 'none' : 'inline-block'; // Hide Back for P1
        btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? 'Start Game' : 'Next';
    }

     function initializeGame() {
        console.log("Initializing game...");
        console.log("Final Player Data:", playerData);
        // --- Game Initialization Logic ---
        // 1. Randomly select a layout card based on numberOfPlayers (will be complex)
        // 2. Set up the initial board state in memory (positions, hazards etc.)
        // 3. Render the board state on the #screen-gameplay grid (will be complex)
        // 4. Set up turn tracking, AP etc.
        // 5. Show the gameplay screen
        showScreen('gameplay'); // For now, just switch the screen
    }


    // --- Event Listeners ---

    // Player Count Selection
    playerCountButtons.forEach(button => {
        button.addEventListener('click', () => {
            numberOfPlayers = parseInt(button.dataset.count);
            playerData = new Array(numberOfPlayers); // Initialize player data array
            selectedClasses = []; // Reset selected classes for new game setup
            console.log(`Number of players selected: ${numberOfPlayers}`);
            updatePlayerSetupScreen(0); // Start setup for Player 1 (index 0)
            showScreen('playerSetup');
        });
    });

    // Class Selection Buttons
    classButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.disabled) return; // Ignore clicks on disabled buttons

            // Deselect previously selected button for this player
            let currentlySelected = classSelectionContainer.querySelector('.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected');
            }

            // Select the new button
            button.classList.add('selected');
            const selectedClass = button.dataset.class;
            playerData[currentPlayerSetupIndex].class = selectedClass; // Store selection
            console.log(`Player ${currentPlayerSetupIndex + 1} selected class: ${selectedClass}`);
            displayClassDetails(selectedClass); // Update details display
        });
    });

     // Player Name Input (update state on change)
     playerNameInput.addEventListener('input', () => {
        // Use placeholder if input is empty, otherwise use input value
        playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`;
        console.log(`Player ${currentPlayerSetupIndex + 1} name set to: ${playerData[currentPlayerSetupIndex].name}`);
     });


    // Back Button (Player Setup)
    btnBack.addEventListener('click', () => {
        console.log("Back button clicked");
        if (currentPlayerSetupIndex > 0) {
            // Remove the class selected by the *current* player from the list before going back
            const currentClassSelection = playerData[currentPlayerSetupIndex].class;
             if(currentClassSelection) {
                 const classIndex = selectedClasses.indexOf(currentClassSelection);
                 if (classIndex > -1) {
                     selectedClasses.splice(classIndex, 1);
                     console.log("Removed class from selected list:", currentClassSelection, selectedClasses);
                 }
             }

            // Go back to previous player's setup
            updatePlayerSetupScreen(currentPlayerSetupIndex - 1);
        } else {
            // Go back to player count selection
             selectedClasses = []; // Clear selected classes list
             playerData = []; // Clear player data
            showScreen('playerCount');
        }
    });

    // Next / Start Game Button
    btnNext.addEventListener('click', () => {
        console.log("Next/Start Game button clicked");
        const currentPlayerData = playerData[currentPlayerSetupIndex];

        // Validate: Class must be selected
        if (!currentPlayerData.class) {
            alert(`Please select a class for Player ${currentPlayerSetupIndex + 1}!`);
            return;
        }

         // Ensure name is set (even if default)
         if (!currentPlayerData.name) {
             currentPlayerData.name = playerNameInput.placeholder || `P${currentPlayerSetupIndex + 1}`;
         }

        // Add selected class to the list to prevent reuse
        if (!selectedClasses.includes(currentPlayerData.class)) {
             selectedClasses.push(currentPlayerData.class);
             console.log("Added class to selected list:", currentPlayerData.class, selectedClasses);
        }


        // Check if more players need setup
        if (currentPlayerSetupIndex < numberOfPlayers - 1) {
            // Move to next player's setup
            updatePlayerSetupScreen(currentPlayerSetupIndex + 1);
        } else {
            // Last player, start the game
             initializeGame();
        }
    });

     // --- Temporary Restart Button ---
     btnRestartStub.addEventListener('click', () => {
        console.log("Restart Stub clicked");
         // Reset state variables (important for a real restart)
         numberOfPlayers = 0;
         currentPlayerSetupIndex = 0;
         playerData = [];
         selectedClasses = [];
         // TODO: Add full game state reset here later
         showScreen('playerCount');
     });
     // Add event listeners for popup close buttons later


    // --- Initial Setup ---
    showScreen('playerCount'); // Start with the player count screen

}); // End DOMContentLoaded
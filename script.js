document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Top-Level State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0;
    let playerData = []; // Array to hold { name: 'P1', class: null } objects
    let selectedClasses = []; // Keep track of classes chosen so far in setup
    let currentGameState = {
        // ... existing properties ...
        lockedInVampireIdThisTurn: null, // ADD THIS: Stores the ID of the locked-in vamp for non-Vigilantes
        lastActionVampId: null, // Keep this for Swift Justice later
        // ... rest of state
    };
    let gameHistory = []; // Stores previous game states for Undo
    let lastActiveScreenId = "playerCount"; // Track where help was opened from
    // --- Add these flags for Swift Justice state ---
    let isSwiftJusticeMovePending = false;
    let swiftJusticePlayerIndex = -1; // Store which player is performing SJ
    let swiftJusticeVampId = null; // Store which vampire is performing SJ

    // --- 2. Constants ---
    const AP_COST = {
        MOVE: 1,
        PIVOT: 1,
        SHOOT: 3,
        SILVER_BULLET: 3,
        THROW_HAZARD: 1,
        THROW_DYNAMITE: 2,
        DISPEL: 3,
        BITE_FUSE: 1,
        RAMPAGE: 2,
        HAND_CANNON: 5,
        ORDER_RESTORED: 3,
        CONTRACT_PAYOFF: 3,
        VENGEANCE_IS_MINE: 0, // Though cost is 0, still an action choice
        // --- END ADD ---
    };
    const DIRECTIONS = ["N", "E", "S", "W"];

    const CLASS_DATA = {
        // Narrative descriptions updated to ~150 chars for Setup Screen
        Sheriff: {
            color: "color-sheriff",
            description: "A faction of Vampires enforcing order in a chaotic frontier.",
            abilities: [
                {
                    name: "Under My Protection",
                    type: "Passive",
                    apCost: 0,
                    description: "The Sheriff's vigilance shields nearby Bloodwells, making them difficult targets for careless foes seeking an easy shot.",
                    techDesc: "Bloodwells in 3x3 grid centered on Sheriff are immune to standard Shots (not Hand Cannon).",
                },
                {
                    name: "Swift Justice",
                    type: "Passive",
                    apCost: 0,
                    description: "Fueled by unwavering purpose, one Sheriff presses forward relentlessly, taking a swift extra step after the turn's actions conclude.",
                    techDesc: "End of Turn: May move one non-cursed Sheriff 1 square forward (0 AP).",
                },
                {
                    name: "Order Restored",
                    type: "Active",
                    apCost: 3,
                    description: "Even true death cannot halt the Sheriff's decree! By dark ritual, call back a comrade destroyed in battle to rejoin the fight for order.",
                    techDesc: "1/game: Revive one eliminated Sheriff adjacent to own Vamp/BW.",
                },
            ],
        },
        Vigilante: {
            color: "color-vigilante",
            description: "A faction of Vampires seeking justice, using teamwork.",
            abilities: [
                {
                    name: "Side by Side",
                    type: "Passive",
                    apCost: 0,
                    description: "Bound by blood and vengeance, this driven pair acts as one, drawing from a shared pool of unnatural energy for their actions.",
                    techDesc: "Player's AP pool is shared between both Vampires.",
                },
                {
                    name: "Blood Brothers",
                    type: "Passive",
                    apCost: 0,
                    description: "Their shared purpose empowers their dark bond when near. Fighting side-by-side fills this ruthless kin with a surge of preternatural energy.",
                    techDesc: "Start of Turn: +1 AP if Vamps are within 3x3 grid and both act this turn.",
                },
                {
                    name: "Vengeance is Mine",
                    type: "Active",
                    apCost: 0,
                    description: "Harm my kin, feel my wrath tenfold! Wounds suffered only fuel their dark rage, promising overwhelming fury on their next turn.",
                    techDesc: "1/game: After own piece is shot, gain 7 AP next turn.",
                },
            ],
        },
        Outlaw: {
            color: "color-outlaw",
            description: "A faction of Vampires thriving on chaos, disrupting and escaping.",
            abilities: [
                {
                    name: "Daring Escape",
                    type: "Passive",
                    apCost: 0,
                    description: "Blast an enemy Bloodwell, then melt into the shadows, using the chaos for a swift, spectral getaway and repositioning.",
                    techDesc: "1/turn: After shooting a Bloodwell, may Pivot free & Move up to 2 squares (0 AP).",
                },
                {
                    name: "Hand Cannon",
                    type: "Active",
                    apCost: 5,
                    description: "Unleash unholy hellfire from a modified Hand Cannon! This cursed shot tears through obstacles and stone alike in its destructive path.",
                    techDesc: "1/game: Piercing shot (max 5 sq), ignores Hazards (unless Sheriff-prot.). Destroys BW/Hazards hit.",
                },
                {
                    name: "Rampage",
                    type: "Active",
                    apCost: 2,
                    description: "Embrace the chaos! The Outlaw spins wildly, unleashing a hail of lead left and right simultaneously to catch foes in a deadly crossfire.",
                    techDesc: "1/game: Shoot simultaneously Left & Right (two standard shots).",
                },
            ],
        },
        "Bounty Hunter": {
            color: "color-bounty-hunter",
            description: "A faction of Vampires hunting for profit, using precision.",
            abilities: [
                {
                    name: "Sharpshooter",
                    type: "Passive",
                    apCost: 0,
                    description: "Tombstones offer no refuge. This Hunter's unnervingly accurate shots find paths through solid stone, leaving no target truly safe.",
                    techDesc: "Shots ignore Tombstones when determining hit/block.",
                },
                {
                    name: "Marked Man",
                    type: "Passive",
                    apCost: 0,
                    description: "Every bullet carries a debilitating hex. Vampires struck find their unnatural vitality failing, crippling their movement and attacks.",
                    techDesc: "Standard shots hitting enemy Vamps apply Curse (Move 1/turn, No Shoot/Throw).",
                },
                {
                    name: "Contract Payoff",
                    type: "Active",
                    apCost: 3,
                    description: "Destroying an enemy Bloodwell brings dark satisfaction and fuels the Hunter with bonus energy for the next strike.",
                    techDesc: "1/game: If shot destroys any BW, gain +3 AP (2P) / +5 AP (3P/4P) next turn.",
                },
            ],
        },
    };
    // ... (LAYOUT_DATA etc. follow) ...
    const LAYOUT_DATA = {
        2: [
            // --- 2P Layout 1 (4T, 3BW, 3GD) ---
            {
                vampires: [
                    { player: 0, coord: "B2", facing: "S", id: "P1V1" },
                    { player: 0, coord: "D2", facing: "S", id: "P1V2" },
                    { player: 1, coord: "H8", facing: "N", id: "P2V1" },
                    { player: 1, coord: "F8", facing: "N", id: "P2V2" },
                ],
                bloodwells: [
                    { player: 0, coord: "A1", id: "P1BW1" },
                    { player: 0, coord: "C1", id: "P1BW2" },
                    { player: 0, coord: "E1", id: "P1BW3" },
                    { player: 1, coord: "I9", id: "P2BW1" },
                    { player: 1, coord: "G9", id: "P2BW2" },
                    { player: 1, coord: "E9", id: "P2BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 3BW, 3GD
                    { type: "Tombstone", coord: "C4" },
                    { type: "Tombstone", coord: "G6" },
                    { type: "Tombstone", coord: "E5" },
                    { type: "Tombstone", coord: "E7" },
                    { type: "Black Widow", coord: "D6" },
                    { type: "Black Widow", coord: "F4" },
                    { type: "Black Widow", coord: "H5" },
                    { type: "Grave Dust", coord: "B5" },
                    { type: "Grave Dust", coord: "E3" },
                    { type: "Grave Dust", coord: "G5" },
                ],
            },
            // --- 2P Layout 2 (3T, 4BW, 3GD) ---
            {
                vampires: [
                    { player: 0, coord: "A3", facing: "E", id: "P1V1" },
                    { player: 0, coord: "A5", facing: "E", id: "P1V2" },
                    { player: 1, coord: "I7", facing: "W", id: "P2V1" },
                    { player: 1, coord: "I5", facing: "W", id: "P2V2" },
                ],
                bloodwells: [
                    { player: 0, coord: "B1", id: "P1BW1" },
                    { player: 0, coord: "B4", id: "P1BW2" },
                    { player: 0, coord: "B6", id: "P1BW3" },
                    { player: 1, coord: "H9", id: "P2BW1" },
                    { player: 1, coord: "H6", id: "P2BW2" },
                    { player: 1, coord: "H4", id: "P2BW3" },
                ],
                hazards: [
                    // 10 total: 3T, 4BW, 3GD
                    { type: "Tombstone", coord: "D4" },
                    { type: "Tombstone", coord: "F6" },
                    { type: "Tombstone", coord: "E8" },
                    { type: "Black Widow", coord: "C7" },
                    { type: "Black Widow", coord: "E5" },
                    { type: "Black Widow", coord: "G3" },
                    { type: "Black Widow", coord: "D2" },
                    { type: "Grave Dust", coord: "C3" },
                    { type: "Grave Dust", coord: "E2" },
                    { type: "Grave Dust", coord: "G7" },
                ],
            },
            // --- 2P Layout 3 (3T, 3BW, 4GD) ---
            {
                vampires: [
                    { player: 0, coord: "C3", facing: "S", id: "P1V1" },
                    { player: 0, coord: "E1", facing: "S", id: "P1V2" },
                    { player: 1, coord: "G7", facing: "N", id: "P2V1" },
                    { player: 1, coord: "E9", facing: "N", id: "P2V2" },
                ],
                bloodwells: [
                    { player: 0, coord: "A2", id: "P1BW1" },
                    { player: 0, coord: "D2", id: "P1BW2" },
                    { player: 0, coord: "G2", id: "P1BW3" },
                    { player: 1, coord: "C8", id: "P2BW1" },
                    { player: 1, coord: "F8", id: "P2BW2" },
                    { player: 1, coord: "I8", id: "P2BW3" },
                ],
                hazards: [
                    // 10 total: 3T, 3BW, 4GD
                    { type: "Tombstone", coord: "C5" },
                    { type: "Tombstone", coord: "G5" },
                    { type: "Tombstone", coord: "E4" },
                    { type: "Black Widow", coord: "E6" },
                    { type: "Black Widow", coord: "D4" },
                    { type: "Black Widow", coord: "F6" },
                    { type: "Grave Dust", coord: "B7" },
                    { type: "Grave Dust", coord: "H3" },
                    { type: "Grave Dust", coord: "E7" },
                    { type: "Grave Dust", coord: "D3" },
                ],
            },
            // --- 2P Layout 4 (4T, 4BW, 2GD) ---
            {
                vampires: [
                    { player: 0, coord: "B1", facing: "S", id: "P1V1" },
                    { player: 0, coord: "B3", facing: "S", id: "P1V2" },
                    { player: 1, coord: "H9", facing: "N", id: "P2V1" },
                    { player: 1, coord: "H7", facing: "N", id: "P2V2" },
                ],
                bloodwells: [
                    { player: 0, coord: "A2", id: "P1BW1" },
                    { player: 0, coord: "C2", id: "P1BW2" },
                    { player: 0, coord: "D4", id: "P1BW3" },
                    { player: 1, coord: "I8", id: "P2BW1" },
                    { player: 1, coord: "G8", id: "P2BW2" },
                    { player: 1, coord: "F6", id: "P2BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 4BW, 2GD
                    { type: "Tombstone", coord: "D5" },
                    { type: "Tombstone", coord: "F5" },
                    { type: "Tombstone", coord: "C7" },
                    { type: "Tombstone", coord: "G3" },
                    { type: "Black Widow", coord: "E4" },
                    { type: "Black Widow", coord: "E6" },
                    { type: "Black Widow", coord: "B5" },
                    { type: "Black Widow", coord: "H5" },
                    { type: "Grave Dust", coord: "D3" },
                    { type: "Grave Dust", coord: "F7" },
                ],
            },
            // --- 2P Layout 5 (4T, 2BW, 4GD) ---
            {
                vampires: [
                    { player: 0, coord: "A8", facing: "E", id: "P1V1" },
                    { player: 0, coord: "C9", facing: "E", id: "P1V2" },
                    { player: 1, coord: "I2", facing: "W", id: "P2V1" },
                    { player: 1, coord: "G1", facing: "W", id: "P2V2" },
                ],
                bloodwells: [
                    { player: 0, coord: "B7", id: "P1BW1" },
                    { player: 0, coord: "D7", id: "P1BW2" },
                    { player: 0, coord: "B9", id: "P1BW3" },
                    { player: 1, coord: "H3", id: "P2BW1" },
                    { player: 1, coord: "F3", id: "P2BW2" },
                    { player: 1, coord: "H1", id: "P2BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 2BW, 4GD
                    { type: "Tombstone", coord: "E4" },
                    { type: "Tombstone", coord: "E6" },
                    { type: "Tombstone", coord: "C5" },
                    { type: "Tombstone", coord: "G5" },
                    { type: "Black Widow", coord: "D3" },
                    { type: "Black Widow", coord: "F7" },
                    { type: "Grave Dust", coord: "D7" },
                    { type: "Grave Dust", coord: "F3" },
                    { type: "Grave Dust", coord: "B4" },
                    { type: "Grave Dust", coord: "H6" },
                ],
            },
        ],
        3: [
            // --- 3P Layout 1 (4T, 3BW, 3GD) ---
            {
                vampires: [
                    { player: 0, coord: "B2", facing: "S", id: "P1V1" },
                    { player: 0, coord: "D1", facing: "S", id: "P1V2" }, // Top-Left
                    { player: 1, coord: "F1", facing: "S", id: "P2V1" },
                    { player: 1, coord: "H2", facing: "S", id: "P2V2" }, // Top-Right
                    { player: 2, coord: "E9", facing: "N", id: "P3V1" },
                    { player: 2, coord: "G8", facing: "W", id: "P3V2" },
                ], // Bottom-Middle/Right
                bloodwells: [
                    { player: 0, coord: "A1", id: "P1BW1" },
                    { player: 0, coord: "C1", id: "P1BW2" },
                    { player: 0, coord: "B3", id: "P1BW3" },
                    { player: 1, coord: "I1", id: "P2BW1" },
                    { player: 1, coord: "G1", id: "P2BW2" },
                    { player: 1, coord: "H3", id: "P2BW3" },
                    { player: 2, coord: "D9", id: "P3BW1" },
                    { player: 2, coord: "F9", id: "P3BW2" },
                    { player: 2, coord: "H9", id: "P3BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 3BW, 3GD
                    { type: "Tombstone", coord: "D4" },
                    { type: "Tombstone", coord: "F4" },
                    { type: "Tombstone", coord: "E6" },
                    { type: "Tombstone", coord: "C6" },
                    { type: "Black Widow", coord: "E2" },
                    { type: "Black Widow", coord: "G5" },
                    { type: "Black Widow", coord: "B5" },
                    { type: "Grave Dust", coord: "D7" },
                    { type: "Grave Dust", coord: "F7" },
                    { type: "Grave Dust", coord: "E5" },
                ],
            },
            // --- 3P Layout 2 (3T, 4BW, 3GD) ---
            {
                vampires: [
                    { player: 0, coord: "A4", facing: "E", id: "P1V1" },
                    { player: 0, coord: "C2", facing: "S", id: "P1V2" }, // Left/Top-Left
                    { player: 1, coord: "G2", facing: "S", id: "P2V1" },
                    { player: 1, coord: "I4", facing: "W", id: "P2V2" }, // Right/Top-Right
                    { player: 2, coord: "C8", facing: "N", id: "P3V1" },
                    { player: 2, coord: "G8", facing: "N", id: "P3V2" },
                ], // Bottom
                bloodwells: [
                    { player: 0, coord: "B1", id: "P1BW1" },
                    { player: 0, coord: "A6", id: "P1BW2" },
                    { player: 0, coord: "D3", id: "P1BW3" },
                    { player: 1, coord: "H1", id: "P2BW1" },
                    { player: 1, coord: "I6", id: "P2BW2" },
                    { player: 1, coord: "F3", id: "P2BW3" },
                    { player: 2, coord: "B9", id: "P3BW1" },
                    { player: 2, coord: "E9", id: "P3BW2" },
                    { player: 2, coord: "H9", id: "P3BW3" },
                ],
                hazards: [
                    // 10 total: 3T, 4BW, 3GD
                    { type: "Tombstone", coord: "E4" },
                    { type: "Tombstone", coord: "C6" },
                    { type: "Tombstone", coord: "G6" },
                    { type: "Black Widow", coord: "E6" },
                    { type: "Black Widow", coord: "D5" },
                    { type: "Black Widow", coord: "F5" },
                    { type: "Black Widow", coord: "E7" },
                    { type: "Grave Dust", coord: "B4" },
                    { type: "Grave Dust", coord: "H4" },
                    { type: "Grave Dust", coord: "E2" },
                ],
            },
            // --- 3P Layout 3 (3T, 3BW, 4GD) ---
            {
                vampires: [
                    { player: 0, coord: "E1", facing: "S", id: "P1V1" },
                    { player: 0, coord: "G3", facing: "W", id: "P1V2" }, // Top-Right/East
                    { player: 1, coord: "A5", facing: "S", id: "P2V1" },
                    { player: 1, coord: "C3", facing: "E", id: "P2V2" }, // West/Top-Left
                    { player: 2, coord: "C7", facing: "N", id: "P3V1" },
                    { player: 2, coord: "G7", facing: "N", id: "P3V2" },
                ], // South
                bloodwells: [
                    { player: 0, coord: "I2", id: "P1BW1" },
                    { player: 0, coord: "G1", id: "P1BW2" },
                    { player: 0, coord: "I4", id: "P1BW3" },
                    { player: 1, coord: "A1", id: "P2BW1" },
                    { player: 1, coord: "A3", id: "P2BW2" },
                    { player: 1, coord: "C1", id: "P2BW3" },
                    { player: 2, coord: "B9", id: "P3BW1" },
                    { player: 2, coord: "E9", id: "P3BW2" },
                    { player: 2, coord: "H9", id: "P3BW3" },
                ],
                hazards: [
                    // 10 total: 3T, 3BW, 4GD
                    { type: "Tombstone", coord: "D5" },
                    { type: "Tombstone", coord: "F5" },
                    { type: "Tombstone", coord: "E3" },
                    { type: "Black Widow", coord: "E7" },
                    { type: "Black Widow", coord: "C6" },
                    { type: "Black Widow", coord: "G4" },
                    { type: "Grave Dust", coord: "B4" },
                    { type: "Grave Dust", coord: "H6" },
                    { type: "Grave Dust", coord: "D2" },
                    { type: "Grave Dust", coord: "F8" },
                ],
            },
            // --- 3P Layout 4 (4T, 4BW, 2GD) ---
            {
                vampires: [
                    { player: 0, coord: "B1", facing: "S", id: "P1V1" },
                    { player: 0, coord: "C3", facing: "E", id: "P1V2" }, // Top-Left
                    { player: 1, coord: "H1", facing: "S", id: "P2V1" },
                    { player: 1, coord: "G3", facing: "W", id: "P2V2" }, // Top-Right
                    { player: 2, coord: "E8", facing: "N", id: "P3V1" },
                    { player: 2, coord: "E6", facing: "N", id: "P3V2" },
                ], // Bottom-Middle
                bloodwells: [
                    { player: 0, coord: "A2", id: "P1BW1" },
                    { player: 0, coord: "A4", id: "P1BW2" },
                    { player: 0, coord: "D2", id: "P1BW3" },
                    { player: 1, coord: "I2", id: "P2BW1" },
                    { player: 1, coord: "I4", id: "P2BW2" },
                    { player: 1, coord: "F2", id: "P2BW3" },
                    { player: 2, coord: "C9", id: "P3BW1" },
                    { player: 2, coord: "E9", id: "P3BW2" },
                    { player: 2, coord: "G9", id: "P3BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 4BW, 2GD
                    { type: "Tombstone", coord: "E4" },
                    { type: "Tombstone", coord: "C5" },
                    { type: "Tombstone", coord: "G5" },
                    { type: "Tombstone", coord: "E6" }, // E6 hazard blocks P3V2 initial move
                    { type: "Black Widow", coord: "D3" },
                    { type: "Black Widow", coord: "F3" },
                    { type: "Black Widow", coord: "D7" },
                    { type: "Black Widow", coord: "F7" },
                    { type: "Grave Dust", coord: "B6" },
                    { type: "Grave Dust", coord: "H6" },
                ],
            },
            // --- 3P Layout 5 (4T, 2BW, 4GD) ---
            {
                vampires: [
                    { player: 0, coord: "A7", facing: "N", id: "P1V1" },
                    { player: 0, coord: "C9", facing: "E", id: "P1V2" }, // Bottom-Left
                    { player: 1, coord: "G9", facing: "W", id: "P2V1" },
                    { player: 1, coord: "I7", facing: "N", id: "P2V2" }, // Bottom-Right
                    { player: 2, coord: "C1", facing: "S", id: "P3V1" },
                    { player: 2, coord: "G1", facing: "S", id: "P3V2" },
                ], // Top
                bloodwells: [
                    { player: 0, coord: "A9", id: "P1BW1" },
                    { player: 0, coord: "B8", id: "P1BW2" },
                    { player: 0, coord: "D9", id: "P1BW3" },
                    { player: 1, coord: "I9", id: "P2BW1" },
                    { player: 1, coord: "H8", id: "P2BW2" },
                    { player: 1, coord: "F9", id: "P2BW3" },
                    { player: 2, coord: "A2", id: "P3BW1" },
                    { player: 2, coord: "E2", id: "P3BW2" },
                    { player: 2, coord: "I2", id: "P3BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 2BW, 4GD
                    { type: "Tombstone", coord: "E4" },
                    { type: "Tombstone", coord: "E6" },
                    { type: "Tombstone", coord: "C5" },
                    { type: "Tombstone", coord: "G5" },
                    { type: "Black Widow", coord: "D3" },
                    { type: "Black Widow", coord: "F7" },
                    { type: "Grave Dust", coord: "D7" },
                    { type: "Grave Dust", coord: "F3" },
                    { type: "Grave Dust", coord: "B5" },
                    { type: "Grave Dust", coord: "H5" },
                ],
            },
        ],
        4: [
            // --- 4P Layout 1 (4T, 3BW, 3GD) ---
            {
                vampires: [
                    { player: 0, coord: "B2", facing: "S", id: "P1V1" },
                    { player: 0, coord: "C1", facing: "E", id: "P1V2" }, // TL
                    { player: 1, coord: "G1", facing: "W", id: "P2V1" },
                    { player: 1, coord: "H2", facing: "S", id: "P2V2" }, // TR
                    { player: 2, coord: "B8", facing: "N", id: "P3V1" },
                    { player: 2, coord: "C9", facing: "E", id: "P3V2" }, // BL
                    { player: 3, coord: "G9", facing: "W", id: "P4V1" },
                    { player: 3, coord: "H8", facing: "N", id: "P4V2" },
                ], // BR
                bloodwells: [
                    { player: 0, coord: "A1", id: "P1BW1" },
                    { player: 0, coord: "A3", id: "P1BW2" },
                    { player: 0, coord: "D1", id: "P1BW3" },
                    { player: 1, coord: "I1", id: "P2BW1" },
                    { player: 1, coord: "I3", id: "P2BW2" },
                    { player: 1, coord: "F1", id: "P2BW3" },
                    { player: 2, coord: "A9", id: "P3BW1" },
                    { player: 2, coord: "A7", id: "P3BW2" },
                    { player: 2, coord: "D9", id: "P3BW3" },
                    { player: 3, coord: "I9", id: "P4BW1" },
                    { player: 3, coord: "I7", id: "P4BW2" },
                    { player: 3, coord: "F9", id: "P4BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 3BW, 3GD
                    { type: "Tombstone", coord: "E3" },
                    { type: "Tombstone", coord: "C5" },
                    { type: "Tombstone", coord: "G5" },
                    { type: "Tombstone", coord: "E7" },
                    { type: "Black Widow", coord: "D4" },
                    { type: "Black Widow", coord: "F6" },
                    { type: "Black Widow", coord: "B7" },
                    { type: "Grave Dust", coord: "H4" },
                    { type: "Grave Dust", coord: "E5" },
                    { type: "Grave Dust", coord: "D6" },
                ],
            },
            // --- 4P Layout 2 (3T, 4BW, 3GD) ---
            {
                vampires: [
                    { player: 0, coord: "A2", facing: "E", id: "P1V1" },
                    { player: 0, coord: "C1", facing: "S", id: "P1V2" }, // TL
                    { player: 1, coord: "I2", facing: "W", id: "P2V1" },
                    { player: 1, coord: "G1", facing: "S", id: "P2V2" }, // TR
                    { player: 2, coord: "A8", facing: "E", id: "P3V1" },
                    { player: 2, coord: "C9", facing: "N", id: "P3V2" }, // BL
                    { player: 3, coord: "I8", facing: "W", id: "P4V1" },
                    { player: 3, coord: "G9", facing: "N", id: "P4V2" },
                ], // BR
                bloodwells: [
                    { player: 0, coord: "B3", id: "P1BW1" },
                    { player: 0, coord: "D2", id: "P1BW2" },
                    { player: 0, coord: "B1", id: "P1BW3" },
                    { player: 1, coord: "H3", id: "P2BW1" },
                    { player: 1, coord: "F2", id: "P2BW2" },
                    { player: 1, coord: "H1", id: "P2BW3" },
                    { player: 2, coord: "B7", id: "P3BW1" },
                    { player: 2, coord: "D8", id: "P3BW2" },
                    { player: 2, coord: "B9", id: "P3BW3" },
                    { player: 3, coord: "H7", id: "P4BW1" },
                    { player: 3, coord: "F8", id: "P4BW2" },
                    { player: 3, coord: "H9", id: "P4BW3" },
                ],
                hazards: [
                    // 10 total: 3T, 4BW, 3GD
                    { type: "Tombstone", coord: "D5" },
                    { type: "Tombstone", coord: "F5" },
                    { type: "Tombstone", coord: "E7" },
                    { type: "Black Widow", coord: "E3" },
                    { type: "Black Widow", coord: "C4" },
                    { type: "Black Widow", coord: "G6" },
                    { type: "Black Widow", coord: "E5" },
                    { type: "Grave Dust", coord: "D7" },
                    { type: "Grave Dust", coord: "F3" },
                    { type: "Grave Dust", coord: "B5" },
                ],
            },
            // --- 4P Layout 3 (3T, 3BW, 4GD) ---
            {
                vampires: [
                    { player: 0, coord: "B3", facing: "S", id: "P1V1" },
                    { player: 0, coord: "D3", facing: "E", id: "P1V2" }, // Top-Leftish
                    { player: 1, coord: "F3", facing: "W", id: "P2V1" },
                    { player: 1, coord: "H3", facing: "S", id: "P2V2" }, // Top-Rightish
                    { player: 2, coord: "B7", facing: "N", id: "P3V1" },
                    { player: 2, coord: "D7", facing: "E", id: "P3V2" }, // Bottom-Leftish
                    { player: 3, coord: "F7", facing: "W", id: "P4V1" },
                    { player: 3, coord: "H7", facing: "N", id: "P4V2" },
                ], // Bottom-Rightish
                bloodwells: [
                    { player: 0, coord: "A1", id: "P1BW1" },
                    { player: 0, coord: "C1", id: "P1BW2" },
                    { player: 0, coord: "E1", id: "P1BW3" },
                    { player: 1, coord: "G1", id: "P2BW1" },
                    { player: 1, coord: "I1", id: "P2BW2" },
                    { player: 1, coord: "E2", id: "P2BW3" }, // P2 BW slightly different
                    { player: 2, coord: "A9", id: "P3BW1" },
                    { player: 2, coord: "C9", id: "P3BW2" },
                    { player: 2, coord: "E9", id: "P3BW3" },
                    { player: 3, coord: "G9", id: "P4BW1" },
                    { player: 3, coord: "I9", id: "P4BW2" },
                    { player: 3, coord: "E8", id: "P4BW3" },
                ], // P4 BW slightly different
                hazards: [
                    // 10 total: 3T, 3BW, 4GD
                    { type: "Tombstone", coord: "E4" },
                    { type: "Tombstone", coord: "C6" },
                    { type: "Tombstone", coord: "G6" },
                    { type: "Black Widow", coord: "D5" },
                    { type: "Black Widow", coord: "F5" },
                    { type: "Black Widow", coord: "E6" }, // Center heavy BW
                    { type: "Grave Dust", coord: "B5" },
                    { type: "Grave Dust", coord: "H5" },
                    { type: "Grave Dust", coord: "D2" },
                    { type: "Grave Dust", coord: "F8" },
                ],
            },
            // --- 4P Layout 4 (4T, 4BW, 2GD) ---
            {
                vampires: [
                    { player: 0, coord: "A3", facing: "S", id: "P1V1" },
                    { player: 0, coord: "B1", facing: "E", id: "P1V2" }, // TL Corner
                    { player: 1, coord: "G1", facing: "W", id: "P2V1" },
                    { player: 1, coord: "I3", facing: "N", id: "P2V2" }, // TR Corner
                    { player: 2, coord: "C9", facing: "E", id: "P3V1" },
                    { player: 2, coord: "A7", facing: "S", id: "P3V2" }, // BL Corner
                    { player: 3, coord: "I7", facing: "N", id: "P4V1" },
                    { player: 3, coord: "G9", facing: "W", id: "P4V2" },
                ], // BR Corner
                bloodwells: [
                    { player: 0, coord: "C3", id: "P1BW1" },
                    { player: 0, coord: "D1", id: "P1BW2" },
                    { player: 0, coord: "A1", id: "P1BW3" },
                    { player: 1, coord: "G3", id: "P2BW1" },
                    { player: 1, coord: "F1", id: "P2BW2" },
                    { player: 1, coord: "I1", id: "P2BW3" },
                    { player: 2, coord: "C7", id: "P3BW1" },
                    { player: 2, coord: "D9", id: "P3BW2" },
                    { player: 2, coord: "A9", id: "P3BW3" },
                    { player: 3, coord: "G7", id: "P4BW1" },
                    { player: 3, coord: "F9", id: "P4BW2" },
                    { player: 3, coord: "I9", id: "P4BW3" },
                ],
                hazards: [
                    // 10 total: 4T, 4BW, 2GD
                    { type: "Tombstone", coord: "E2" },
                    { type: "Tombstone", coord: "B5" },
                    { type: "Tombstone", coord: "H5" },
                    { type: "Tombstone", coord: "E8" },
                    { type: "Black Widow", coord: "E4" },
                    { type: "Black Widow", coord: "D6" },
                    { type: "Black Widow", coord: "F6" },
                    { type: "Black Widow", coord: "E6" },
                    { type: "Grave Dust", coord: "C4" },
                    { type: "Grave Dust", coord: "G4" },
                ],
            },
            // --- 4P Layout 5 (2T, 4BW, 4GD) --- *Alternate distribution*
            {
                vampires: [
                    { player: 0, coord: "A5", facing: "S", id: "P1V1" },
                    { player: 0, coord: "C5", facing: "E", id: "P1V2" }, // West Mid
                    { player: 1, coord: "E3", facing: "W", id: "P2V1" },
                    { player: 1, coord: "E1", facing: "S", id: "P2V2" }, // North Mid
                    { player: 2, coord: "G5", facing: "W", id: "P3V1" },
                    { player: 2, coord: "I5", facing: "N", id: "P3V2" }, // East Mid
                    { player: 3, coord: "E7", facing: "E", id: "P4V1" },
                    { player: 3, coord: "E9", facing: "N", id: "P4V2" },
                ], // South Mid
                bloodwells: [
                    { player: 0, coord: "A3", id: "P1BW1" },
                    { player: 0, coord: "A7", id: "P1BW2" },
                    { player: 0, coord: "C3", id: "P1BW3" },
                    { player: 1, coord: "C1", id: "P2BW1" },
                    { player: 1, coord: "G1", id: "P2BW2" },
                    { player: 1, coord: "G3", id: "P2BW3" },
                    { player: 2, coord: "I3", id: "P3BW1" },
                    { player: 2, coord: "I7", id: "P3BW2" },
                    { player: 2, coord: "G7", id: "P3BW3" },
                    { player: 3, coord: "C7", id: "P4BW1" },
                    { player: 3, coord: "G9", id: "P4BW2" },
                    { player: 3, coord: "C9", id: "P4BW3" },
                ],
                hazards: [
                    // 10 total: 2T, 4BW, 4GD
                    { type: "Tombstone", coord: "D4" },
                    { type: "Tombstone", coord: "F6" }, // Only two tombstones
                    { type: "Black Widow", coord: "F4" },
                    { type: "Black Widow", coord: "D6" },
                    { type: "Black Widow", coord: "B7" },
                    { type: "Black Widow", coord: "H3" },
                    { type: "Grave Dust", coord: "B3" },
                    { type: "Grave Dust", coord: "H7" },
                    { type: "Grave Dust", coord: "F2" },
                    { type: "Grave Dust", coord: "D8" },
                ],
            },
        ],
    }; // End LAYOUT_DATA

    // --- 3. DOM Element References --- // Note: Original numbering kept for internal reference, this is Section 2 of pasting sequence
    // Screens & Popups
    const btnHelp = document.getElementById("btn-help");
    const screenHowToPlay = document.getElementById("screen-how-to-play");
    const btnBackToGame = document.getElementById("btn-back-to-game");
    const screens = {
        playerCount: document.getElementById("screen-player-count"),
        playerSetup: document.getElementById("screen-player-setup"),
        gameplay: document.getElementById("screen-gameplay"),
    };
    const popups = {
        elimination: document.getElementById("popup-elimination"),
        victory: document.getElementById("popup-victory"),
        hazardPicker: document.getElementById("hazard-picker"), // Reference the hazard picker popup
        howToPlay: document.getElementById("screen-how-to-play"),
    };

    const movementBar = document.getElementById("movement-bar");
    // Add references for the specific arrow buttons too
    const btnMoveN = document.getElementById("move-n");
    const btnMoveW = document.getElementById("move-w");
    const btnMoveE = document.getElementById("move-e");
    const btnMoveS = document.getElementById("move-s");

    // Player Count Screen Elements
    const playerCountButtons = screens.playerCount.querySelectorAll("button[data-count]");

    // Player Setup Screen Elements
    const playerSetupTitle = document.getElementById("player-setup-title");
    const playerNameLabel = document.getElementById("player-name-label");
    const playerNameInput = document.getElementById("input-player-name");
    const classSelectionContainer = document.getElementById("class-selection-buttons");
    const classButtons = classSelectionContainer.querySelectorAll(".btn-class");
    const btnBackToStart = document.getElementById("btn-back-to-start");
    const classDetailsName = document.getElementById("class-name"); // Setup details
    const classDetailsDescription = document.getElementById("class-description"); // Setup details
    const classDetailsAbilities = document.getElementById("class-abilities"); // Setup details
    const classDetailsContainer = document.getElementById("class-details-container");
    const btnBack = document.getElementById("btn-back");
    const btnNext = document.getElementById("btn-next");

    // Gameplay Screen Elements
    const gameplayScreen = screens.gameplay; // Alias for convenience
    const actionBar = document.getElementById("action-bar");
    const gameBoard = document.getElementById("game-board");
    const playerInfoDisplay = document.getElementById("player-info");
    const currentClassAbilitiesList = document.getElementById("info-class-abilities"); // Gameplay details
    const infoSilverBullet = document.getElementById("info-silver-bullet");
    const statusBarPlayer = document.getElementById("status-player");
    const statusBarAP = document.getElementById("status-ap");
    const statusBarTurn = document.getElementById("status-turn");
    const btnUndo = document.getElementById("btn-undo");
    const btnEndTurn = document.getElementById("btn-end-turn");
    const btnToggleLog = document.getElementById("btn-toggle-log");
    const gameLog = document.getElementById("game-log");
    const logList = document.getElementById("log-list");
    const btnBackToSetup = document.getElementById("btn-back-to-setup"); // Dev button

    // Action Buttons (Gameplay)
    const btnShoot = document.getElementById("action-shoot");
    const btnThrow = document.getElementById("action-throw");
    const btnSilverBullet = document.getElementById("action-silver-bullet");
    const btnDispel = document.getElementById("action-dispel");
    const btnBiteFuse = document.getElementById("action-bite-fuse");
    const btnRampage = document.getElementById("action-rampage");
    const btnHandCannon = document.getElementById("action-hand-cannon");
    const btnContractPayoff = document.getElementById("action-contract-payoff");
    const btnOrderRestored = document.getElementById("action-order-restored");
    const btnVengeance = document.getElementById("action-vengeance");

    // Hazard Picker Elements (Inside the popup)
    const hazardPickerOptions = document.getElementById("hazard-picker-options");
    const btnCancelThrow = document.getElementById("btn-cancel-throw");

    // Inside the "DOMContentLoaded" listener, after DOM References section...

    // --- Checking Gameplay Info Panel DOM References ---
    console.log("--- Checking Gameplay Info Panel DOM References ---");
    // Line for currentClassDetailsName removed
    console.log("  currentClassAbilitiesList:", !!currentClassAbilitiesList);
    console.log("  infoSilverBullet:", !!infoSilverBullet);
    console.log("  statusBarPlayer:", !!statusBarPlayer);
    console.log("  statusBarAP:", !!statusBarAP);
    console.log("--- End Check ---");
    // --- END DEBUG BLOCK ---

    // --- 4. Function Definitions --- // Note: Original numbering kept, this is Section 3 of pasting

    // --- Coordinate Helper Functions ---
    function getRowColFromCoord(coord) {
        if (!coord || coord.length < 2) return null;
        const colLetter = coord.charAt(0).toUpperCase();
        const rowNum = parseInt(coord.substring(1));
        if (isNaN(rowNum) || colLetter < "A" || colLetter > "I" || rowNum < 1 || rowNum > 9) return null;
        return { row: rowNum, col: colLetter.charCodeAt(0) - 64 };
    }
    function getCoordFromRowCol(row, col) {
        if (row < 1 || row > 9 || col < 1 || col > 9) return null;
        const colLetter = String.fromCharCode(64 + col);
        return `${colLetter}${row}`;
    }
    function getAdjacentCoord(coord, direction) {
        const rc = getRowColFromCoord(coord);
        if (!rc) return null;
        let { row, col } = rc;
        if (direction === "N") row--;
        else if (direction === "S") row++;
        else if (direction === "E") col++;
        else if (direction === "W") col--;
        return getCoordFromRowCol(row, col);
    }
    function getAllAdjacentCoords(coord) {
        const adjacentCoords = [];
        const rc = getRowColFromCoord(coord);
        if (!rc) return adjacentCoords;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const adjRow = rc.row + dr;
                const adjCol = rc.col + dc;
                const adjCoord = getCoordFromRowCol(adjRow, adjCol);
                if (adjCoord) adjacentCoords.push(adjCoord);
            }
        }
        return adjacentCoords;
    }
    function getNewFacing(currentFacing, pivotType) {
        const currentIndex = DIRECTIONS.indexOf(currentFacing);
        if (currentIndex === -1) return currentFacing;
        let newIndex;
        if (pivotType === "L") newIndex = (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length;
        else if (pivotType === "R") newIndex = (currentIndex + 1) % DIRECTIONS.length;
        else if (pivotType === "180") newIndex = (currentIndex + 2) % DIRECTIONS.length;
        else return currentFacing;
        return DIRECTIONS[newIndex];
    }
    function getDistance(coord1, coord2) {
        const rc1 = getRowColFromCoord(coord1);
        const rc2 = getRowColFromCoord(coord2);
        if (!rc1 || !rc2) return Infinity;
        return Math.abs(rc1.row - rc2.row) + Math.abs(rc1.col - rc2.col);
    }

    /**
    //* Gets all valid coordinates within a square radius around a center coordinate.
    * @param {string} centerCoord - The center coordinate (e.g., 'E5').
    * @param {number} radius - The distance from the center (1 for 3x3, 2 for 5x5, etc.).
    * @returns {string[]} An array of valid coordinates within the area.
    */
    function getCoordsInArea(centerCoord, radius) {
        const coords = [];
        const centerRC = getRowColFromCoord(centerCoord);
        if (!centerRC) return coords; // Invalid center

        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                // Optional: Skip the center square itself if needed by rules
                // if (dr === 0 && dc === 0) continue;

                const targetRow = centerRC.row + dr;
                const targetCol = centerRC.col + dc;
                const targetCoord = getCoordFromRowCol(targetRow, targetCol);
                if (targetCoord) {
                    // Only add valid board coordinates
                    coords.push(targetCoord);
                }
            }
        }
        return coords;
    }

    // --- UI Helper Functions ---
    // Switches the visible screen & tracks last screen before Help
    // Switches the visible screen OR displays a popup overlay
    function showScreen(screenId) {
        const targetScreenElement = screens[screenId]; // Is it a main screen?
        const targetPopupElement = popups[screenId]; // Is it a popup?

        if (targetScreenElement) {
            // --- Showing a Main Screen ---
            // Record the current active screen BEFORE switching (unless it's a popup)
            const currentActiveScreen = document.querySelector(".screen.active:not(.popup)"); // Find active screen that isn't a popup
            if (currentActiveScreen && currentActiveScreen.id !== screenId) {
                lastActiveScreenId = currentActiveScreen.id;
                console.log(`Stored last screen: ${lastActiveScreenId}`);
            }

            // Hide other main screens and show the target
            Object.values(screens).forEach((screen) => screen?.classList.remove("active")); // Use optional chaining
            targetScreenElement.classList.add("active");
            console.log(`Showing screen: ${screenId}`);

            // Ensure popups are hidden when switching main screens
            Object.values(popups).forEach((popup) => {
                if (popup) popup.style.display = "none";
            });
        } else if (targetPopupElement) {
            // --- Showing a Popup ---
            // Record which main screen is active underneath
            const currentActiveScreen = document.querySelector(".screen.active:not(.popup)");
            if (currentActiveScreen) {
                lastActiveScreenId = currentActiveScreen.id;
                console.log(`Stored last screen before popup: ${lastActiveScreenId}`);
            } else {
                // Fallback if no main screen is active somehow? Should not happen in normal flow.
                lastActiveScreenId = "gameplay"; // Default to gameplay?
                console.warn(`No active main screen found when showing popup ${screenId}. Storing fallback: ${lastActiveScreenId}`);
            }

            // Show the target popup using direct style (matching hazard picker)
            targetPopupElement.style.display = "flex";
            console.log(`Showing popup: ${screenId}`);
        } else {
            // ID not found in screens or popups
            console.error(`Screen/Popup with id "${screenId}" not found.`);
            // Potentially show an error message or default screen
        }
    }
    function displayClassDetails(className) {
        const data = CLASS_DATA[className];
        const nameEl = document.getElementById("class-name");
        const descEl = document.getElementById("class-description");
        const abilitiesEl = document.getElementById("class-abilities");
        const containerEl = document.getElementById("class-details-container");
        if (data) {
            nameEl.innerHTML = `<strong>Class:</strong> ${className}`;
            descEl.textContent = data.description;
            abilitiesEl.innerHTML = "";
            data.abilities.forEach((ability) => {
                const li = document.createElement("li");
                li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`;
                abilitiesEl.appendChild(li);
            });
            containerEl.style.display = "block";
        } else {
            nameEl.innerHTML = `<strong>Class:</strong> ---`;
            descEl.textContent = "Select a class...";
            abilitiesEl.innerHTML = "<li>---</li>";
        }
    }
    // Updates the player setup screen UI for the correct player
    function updatePlayerSetupScreen(playerIndex) {
        const playerNum = playerIndex + 1;
        currentPlayerSetupIndex = playerIndex;

        console.log(`Setting up screen for Player ${playerNum}`);

        // Initialize player data slot if it doesn't exist or reset class
        if (!playerData[playerIndex]) {
            playerData[playerIndex] = { name: `P${playerNum}`, class: null };
        } else {
            playerData[playerIndex].class = null; // Reset class selection when revisiting
        }

        playerNameInput.value = playerData[playerIndex].name !== `P${playerNum}` ? playerData[playerIndex].name : "";
        playerNameInput.placeholder = `P${playerNum} Name (Optional)`;
        playerSetupTitle.textContent = `Player ${playerNum} Setup`;
        playerNameLabel.textContent = `Player ${playerNum} Name:`; // Ensure label updates if needed

        // Reset and update class buttons status
        let previouslySelectedButton = classSelectionContainer.querySelector(".selected");
        if (previouslySelectedButton) {
            previouslySelectedButton.classList.remove("selected");
        }
        classButtons.forEach((button) => {
            const className = button.dataset.class;
            button.disabled = selectedClasses.includes(className); // Disable already chosen classes
            button.style.opacity = button.disabled ? "0.5" : "1";
        });

        // Reset class details display
        displayClassDetails(null);

        // Update navigation buttons visibility and text
        const isFirstPlayer = playerIndex === 0;
        if (btnBack) btnBack.style.display = isFirstPlayer ? "none" : "inline-block"; // Hide Back for P1
        if (btnBackToStart) btnBackToStart.style.display = isFirstPlayer ? "none" : "inline-block"; // Also hide Back to Start for P1
        if (btnNext) {
            btnNext.textContent = playerIndex === numberOfPlayers - 1 ? "Start Game" : "Next";
            btnNext.disabled = true; // Start disabled until class selected
        }
    }
    function addToLog(message) {
        const li = document.createElement("li");
        li.textContent = message;
        while (logList.children.length > 50) logList.removeChild(logList.firstChild);
        logList.appendChild(li);
        if (gameLog && !gameLog.classList.contains("log-hidden")) gameLog.scrollTop = gameLog.scrollHeight;
        console.log("Log:", message);
    }
    function generateGrid() {
        gameBoard.innerHTML = "";
        for (let r = 1; r <= 9; r++) {
            for (let c = 1; c <= 9; c++) {
                const square = document.createElement("div");
                const colLetter = String.fromCharCode(64 + c);
                const coord = `${colLetter}${r}`;
                square.classList.add("grid-square");
                square.dataset.coord = coord;
                gameBoard.appendChild(square);
            }
        }
        console.log("Generated grid.");
    }
    function getPlayerColorClass(playerIndex) {
        const player = currentGameState.players?.[playerIndex];
        return player ? CLASS_DATA[player.class]?.color || "" : "";
    }
    function clearHighlights() {
        document.querySelectorAll(".grid-square.valid-target, .grid-square.invalid-target").forEach((el) => el.classList.remove("valid-target", "invalid-target"));
    }

    // --- Board Rendering & Gameplay UI Update ---

    // Renders pieces on the board based on game state (Updated for Bloodwell Styling)
    // --- Board Rendering & Gameplay UI Update ---

    // Renders pieces on the board based on game state (Corrected Variable Scopes)
    function renderBoard(gameState) {
        // console.log("Rendering board state..."); // Reduce console noise
        document.querySelectorAll(".piece").forEach((p) => p.remove()); // Clear existing pieces

        if (!gameState || !gameState.board) {
            console.error("Render Error: Invalid game state provided.");
            return;
        }

        // Render Vampires
        gameState.board.vampires?.forEach((vamp) => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${vamp.coord}"]`);
            if (targetSquare) {
                // CORRECT: Define and use vampElement *only* within this loop's scope
                const vampElement = document.createElement("div");
                const playerClass = gameState.players[vamp.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || "";
                vampElement.classList.add("piece", "vampire", classColor);
                vampElement.dataset.id = vamp.id;
                vampElement.dataset.player = vamp.player;
                vampElement.dataset.facing = vamp.facing;
                if (vamp.id === gameState.selectedVampireId) vampElement.classList.add("selected");
                if (vamp.cursed) vampElement.classList.add("cursed");
                vampElement.textContent = `P${vamp.player + 1}`;
                targetSquare.appendChild(vampElement); // Use vampElement here
            } else {
                console.warn(`Square not found for vampire ${vamp.id} at ${vamp.coord}`);
            }
        }); // End of Vampire loop scope for vampElement

        // Render Bloodwells
        gameState.board.bloodwells?.forEach((bw) => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${bw.coord}"]`);
            if (targetSquare) {
                // CORRECT: Define and use bwElement within this loop's scope
                const bwElement = document.createElement("div");
                const playerClass = gameState.players[bw.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || "";
                // Add base class AND the specific class color name for border styling
                bwElement.classList.add("piece", "bloodwell", classColor);
                // DO NOT ADD player index class (we switched back to classColor for border)
                bwElement.dataset.id = bw.id;
                bwElement.dataset.player = bw.player;
                bwElement.textContent = "🩸"; // Blood drop icon
                targetSquare.appendChild(bwElement); // Use bwElement here
            } else {
                console.warn(`Square not found for bloodwell ${bw.id} at ${bw.coord}`);
            }
        }); // End of Bloodwell loop scope for bwElement

        // Render Hazards
        gameState.board.hazards?.forEach((hazard) => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${hazard.coord}"]`);
            if (targetSquare) {
                // CORRECT: Define and use hazardElement within this loop's scope
                const hazardElement = document.createElement("div");
                hazardElement.classList.add("piece", "hazard");
                const typeClass = `hazard-${hazard.type.toLowerCase().replace(" ", "-")}`;
                hazardElement.classList.add(typeClass);
                let icon = "?";
                if (hazard.type === "Tombstone") icon = "🪦";
                else if (hazard.type === "Black Widow") icon = "🕷️";
                // Corrected type
                else if (hazard.type === "Grave Dust") icon = "💩";
                else if (hazard.type === "Dynamite") icon = "💥";
                hazardElement.textContent = icon;
                targetSquare.appendChild(hazardElement); // Use hazardElement here
            } else {
                console.warn(`Square not found for hazard at ${hazard.coord}`);
            }
        }); // End of Hazard loop scope for hazardElement
    }

    /**
     * Updates the player info panel and related gameplay button states.
     * Hides unavailable ability buttons (class-specific, 1/game used).
     * Disables visible buttons based on AP, curse status, selection, lock-in, etc.
     * @param {object} player - The current player object { name, class, eliminated }
     * @param {number} turn - The current turn number
     * @param {number} currentAP - The current action points
     * @param {object} resources - The current player's resources { silverBullet, abilitiesUsed, wasShotSinceLastTurn, ... }
     */
    function updatePlayerInfoPanel(player, turn, currentAP, resources) {
        // --- Basic null checks ---
        if (!player || !resources || !currentClassAbilitiesList || !infoSilverBullet || !statusBarPlayer || !statusBarAP) {
            console.error("Info Panel Error: One or more required elements not found or invalid data provided.");
            // Set error state... (Ensure all button refs below exist or add checks)
            if (statusBarPlayer) statusBarPlayer.textContent = "Error";
            if (statusBarAP) statusBarAP.textContent = "??";
            return;
        }

        // --- Update Status Bar ---
        statusBarPlayer.textContent = player.name;
        statusBarAP.textContent = currentAP;

        // --- Update Class Details Panel (Abilities, Silver Bullet Status) ---
        // (Keep your existing logic for populating this section)
        // ... abbreviated ...
        infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used";
        // ... abbreviated ...

        // ---== Update Action & Movement Button States ==---
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        const isVampSelected = !!selectedVamp;
        const isCursed = selectedVamp?.cursed;
        const currentPlayerClass = player.class;
        const lockedVampId = currentGameState.lockedInVampireIdThisTurn;
        const canControlSelected = currentPlayerClass === "Vigilante" || !lockedVampId || !isVampSelected || selectedVamp?.id === lockedVampId;

        let hazardOnVampSquare = null;
        if (selectedVamp) {
            hazardOnVampSquare = currentGameState.board.hazards.find((h) => h.coord === selectedVamp.coord);
        }

        // --- Visibility and Disable Logic for Each Button ---

        // Shoot Button (Always Visible)
        if (btnShoot) {
            btnShoot.style.display = "inline-block";
            btnShoot.disabled = !isVampSelected || !canControlSelected || currentAP < AP_COST.SHOOT || isCursed;
        }

        // Throw Button (Always Visible)
        if (btnThrow) {
            btnThrow.style.display = "inline-block";
            btnThrow.disabled = !isVampSelected || !canControlSelected || currentAP < AP_COST.THROW_HAZARD || isCursed;
        }

        // Silver Bullet Button (Always Visible)
        if (btnSilverBullet) {
            btnSilverBullet.style.display = "inline-block";
            btnSilverBullet.disabled = !isVampSelected || !canControlSelected || currentAP < AP_COST.SILVER_BULLET || resources.silverBullet <= 0 || isCursed;
            btnSilverBullet.title = `Silver Bullet Shot (${AP_COST.SILVER_BULLET} AP)${resources.silverBullet <= 0 ? " - USED" : ""}`;
        }

        // Dispel Button (Always Visible - Core Action)
        const canAffordDispel = currentAP >= AP_COST.DISPEL;
        const canDispel = isVampSelected && hazardOnVampSquare?.type === "Grave Dust" && canAffordDispel;
        if (btnDispel) {
            btnDispel.style.display = "inline-block";
            btnDispel.disabled = !canDispel || !canControlSelected; // Assuming cursed can Dispel
        }

        // Bite Fuse Button (Always Visible - Core Action)
        const canAffordBite = currentAP >= AP_COST.BITE_FUSE;
        const canBite = isVampSelected && hazardOnVampSquare?.type === "Dynamite" && canAffordBite;
        if (btnBiteFuse) {
            btnBiteFuse.style.display = "inline-block";
            btnBiteFuse.disabled = !canBite || !canControlSelected; // Assuming cursed can Bite Fuse
        }

        // Rampage Button (Outlaw Only)
        if (btnRampage) {
            const isOutlaw = player.class === "Outlaw";
            const rampageUsed = resources.abilitiesUsed.includes("Rampage");
            const canAffordRampage = currentAP >= AP_COST.RAMPAGE;
            const isVisible = isOutlaw; // Visible only if Outlaw
            const isAvailable = isVisible && isVampSelected && canControlSelected && canAffordRampage && !rampageUsed && !isCursed;

            btnRampage.style.display = isVisible ? "inline-block" : "none";
            if (isVisible) {
                // Only set disabled if visible
                btnRampage.disabled = !isAvailable;
                btnRampage.title = `Rampage (${AP_COST.RAMPAGE} AP, 1/game)${rampageUsed ? " - USED" : ""}`;
            }
        }

        // Hand Cannon Button (Outlaw Only)
        if (btnHandCannon) {
            const isOutlaw = player.class === "Outlaw";
            const handCannonUsed = resources.abilitiesUsed.includes("Hand Cannon"); // Assuming we track by name
            const canAffordHandCannon = currentAP >= AP_COST.HAND_CANNON;
            const isVisible = isOutlaw;
            const isAvailable = isVisible && isVampSelected && canControlSelected && canAffordHandCannon && !handCannonUsed && !isCursed;

            btnHandCannon.style.display = isVisible ? "inline-block" : "none";
            if (isVisible) {
                btnHandCannon.disabled = !isAvailable;
                btnHandCannon.title = `Hand Cannon (${AP_COST.HAND_CANNON} AP, 1/game)${handCannonUsed ? " - USED" : ""}`;
            }
        }

        // Contract Payoff Button (Bounty Hunter Only)
        if (btnContractPayoff) {
            const isBH = player.class === "Bounty Hunter";
            const contractUsed = resources.abilitiesUsed.includes("Contract Payoff");
            const canAffordContract = currentAP >= AP_COST.CONTRACT_PAYOFF;
            const isVisible = isBH;
            // Condition: Need selected vamp, can control, enough AP, not used, not cursed.
            // Trigger condition (destroying BW) is checked *after* activation in executeShoot.
            const isAvailable = isVisible && isVampSelected && canControlSelected && canAffordContract && !contractUsed && !isCursed;

            btnContractPayoff.style.display = isVisible ? "inline-block" : "none";
            if (isVisible) {
                btnContractPayoff.disabled = !isAvailable;
                btnContractPayoff.title = `Contract Payoff (${AP_COST.CONTRACT_PAYOFF} AP, 1/game)${contractUsed ? " - USED" : ""}`;
            }
        }

        // Order Restored Button (Sheriff Only)
        if (btnOrderRestored) {
            const isSheriff = player.class === "Sheriff";
            const orderUsed = resources.abilitiesUsed.includes("Order Restored");
            const canAffordOrder = currentAP >= AP_COST.ORDER_RESTORED;
            // Check if there's actually an eliminated Sheriff vamp TO revive
            const playerIndex = currentGameState.currentPlayerIndex; // Get index for checking
            const hasEliminatedAlly = currentGameState.eliminatedVampires.some((v) => v.player === playerIndex && CLASS_DATA[v.class]?.color === "color-sheriff"); // Check by player index and ensure it's a Sheriff type

            const isVisible = isSheriff;
            // Condition: Sheriff, selected, can control, afford, not used, not cursed, *and* has an ally to revive
            const isAvailable = isVisible && isVampSelected && canControlSelected && canAffordOrder && !orderUsed && !isCursed && hasEliminatedAlly;
            // TODO: Also needs validation for adjacent placement square, but that happens on execution

            btnOrderRestored.style.display = isVisible ? "inline-block" : "none";
            if (isVisible) {
                btnOrderRestored.disabled = !isAvailable;
                btnOrderRestored.title = `Order Restored (${AP_COST.ORDER_RESTORED} AP, 1/game)${orderUsed ? " - USED" : ""}${!hasEliminatedAlly ? " (No Ally Down)" : ""}`;
            }
        }

        // Vengeance is Mine Button (Vigilante Only)
        if (btnVengeance) {
            const isVigilante = player.class === "Vigilante";
            const vengeanceUsed = resources.abilitiesUsed.includes("Vengeance is Mine");
            const canAffordVengeance = currentAP >= AP_COST.VENGEANCE_IS_MINE; // Always true (cost 0)
            const wasShot = resources.wasShotSinceLastTurn; // Check the trigger flag

            const isVisible = isVigilante;
            // Condition: Vigilante, selected, can control, afford (always), not used, not cursed, *and* was shot since last turn
            const isAvailable = isVisible && isVampSelected && canControlSelected && canAffordVengeance && !vengeanceUsed && !isCursed && wasShot;

            btnVengeance.style.display = isVisible ? "inline-block" : "none";
            if (isVisible) {
                btnVengeance.disabled = !isAvailable;
                btnVengeance.title = `Vengeance is Mine (${AP_COST.VENGEANCE_IS_MINE} AP, 1/game)${vengeanceUsed ? " - USED" : ""}${!wasShot ? " (Not Shot)" : ""}`;
            }
        }

        // --- Movement Buttons ---
        // (Keep Swift Justice check and normal logic from previous step here)
        if (isSwiftJusticeMovePending) {
            // Force enabled during SJ...
            console.log("Swift Justice Pending - Forcing Movement Buttons Enabled");
            if (btnMoveN) btnMoveN.disabled = false; // etc. for E, S, W
            if (btnMoveE) btnMoveE.disabled = false;
            if (btnMoveS) btnMoveS.disabled = false;
            if (btnMoveW) btnMoveW.disabled = false;
            if (movementBar && movementBar.classList.contains("hidden")) {
                movementBar.classList.remove("hidden");
            }
        } else {
            // Normal logic...
            const canAffordMoveOrPivot = currentAP >= AP_COST.MOVE;
            const movesTakenThisTurn = selectedVamp?.movesThisTurn || 0;
            const canMoveForward = !isCursed || movesTakenThisTurn < 1;
            if (btnMoveN) btnMoveN.disabled = !isVampSelected || !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === "N" && !canMoveForward);
            // etc. for E, S, W...
            if (btnMoveE) btnMoveE.disabled = !isVampSelected || !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === "E" && !canMoveForward);
            if (btnMoveS) btnMoveS.disabled = !isVampSelected || !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === "S" && !canMoveForward);
            if (btnMoveW) btnMoveW.disabled = !isVampSelected || !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === "W" && !canMoveForward);

            if (!isVampSelected && movementBar && !movementBar.classList.contains("hidden")) {
                movementBar.classList.add("hidden");
            }
        }
        // --- End Movement Button Logic ---
    } // End of updatePlayerInfoPanel

    /**
     * Main UI update function, called after actions or turn changes.
     * Fetches current player data and calls the panel update function.
     */
    function updateUI() {
        // Basic check for essential game state components (Keep this)
        if (
            !currentGameState?.players?.length ||
            !currentGameState.playerResources?.length ||
            currentGameState.currentPlayerIndex === null || // Added null check for index
            typeof currentGameState.currentPlayerIndex === "undefined"
        ) {
            console.warn("updateUI called with invalid game state (players, resources, or index missing).");
            // Optionally clear/reset UI elements to a default state here
            const statusBarElement = document.getElementById("status-bar");
            if (statusBarElement) {
                statusBarElement.textContent = "Waiting for game...";
                statusBarElement.className = "status-bar"; // Reset classes
                statusBarElement.style.backgroundColor = "#eee"; // Reset style
                statusBarElement.style.color = "#333";
            }
            // Clear other relevant UI elements too
            return;
        }

        const idx = currentGameState.currentPlayerIndex; // Get current player index

        // Validate the index (Keep this)
        if (idx < 0 || idx >= currentGameState.players.length) {
            console.error("updateUI Error: Invalid currentPlayerIndex:", idx);
            return;
        }

        // Get the data for the current player (Keep this)
        const player = currentGameState.players[idx];

        // Check if player data was actually retrieved (Keep this)
        if (!player) {
            console.error("updateUI Error: Could not fetch player for index", idx);
            return;
        }

        // --- Find Status Bar Element ---
        const statusBarElement = document.getElementById("status-bar"); // Moved reference inside for safety

        // --- Update Status Bar Color and Text ---
        if (statusBarElement) {
            const playerClass = player.class; // e.g., "Sheriff"
            const classLower = playerClass?.toLowerCase(); // e.g., "sheriff", handle potential undefined

            // Remove existing color classes first
            statusBarElement.classList.remove("color-sheriff", "color-vigilante", "color-outlaw", "color-bounty-hunter");

            // Add the new class if playerClass exists
            if (classLower) {
                statusBarElement.classList.add(`color-${classLower}`);
            } else {
                // Fallback if class is missing - apply default styles directly
                statusBarElement.style.backgroundColor = "#eee";
                statusBarElement.style.color = "#333";
            }

            // Set the main text content, replacing previous content
            statusBarElement.textContent = playerClass ? `${playerClass}'s Turn` : "Unknown Player's Turn";
        } else {
            console.warn("Status bar element (#status-bar) not found.");
        }
        // --- End Status Bar Update ---

        // --- Call updatePlayerInfoPanel (which handles abilities, AP display, button states) ---
        // This function now focuses on the detailed panel and action buttons
        // We retrieve resources inside updateUI now to pass them along.
        const resources = currentGameState.playerResources[idx];
        if (player && resources) {
            updatePlayerInfoPanel(player, currentGameState.turn, currentGameState.currentAP, resources);
        } else {
            console.error("updateUI Error: Could not fetch player or resources for index", idx);
            // Handle UI error state if necessary
        }

        // --- Other UI Updates ---
        renderBoard(currentGameState); // Ensure board is up-to-date

        // Update Undo Button State (Keep this or similar logic)
        const btnUndo = document.getElementById("btn-undo");
        if (btnUndo) btnUndo.disabled = gameHistory.length === 0;

        // Update selected vampire visuals (Keep this or similar logic)
        // (This might be better handled within renderBoard itself)
        document.querySelectorAll(".grid-square .vampire.selected").forEach((el) => el.classList.remove("selected"));
        if (currentGameState.selectedVampireId) {
            const selectedElement = document.querySelector(`.vampire[data-id="${currentGameState.selectedVampireId}"]`);
            if (selectedElement) {
                selectedElement.classList.add("selected");
            }
        }

        // Ensure movement bar visibility is correct (based on selection, handled in updatePlayerInfoPanel)
    } // End of updateUI

    // --- Game State & Undo Logic ---
    function saveStateToHistory() {
        try {
            gameHistory.push(JSON.parse(JSON.stringify(currentGameState)));
            btnUndo.disabled = false;
            console.log("State saved. History:", gameHistory.length);
        } catch (error) {
            console.error("Error saving state:", error);
            alert("Undo Error!");
        }
    }
    function undoLastAction() {
        if (gameHistory.length > 0) {
            console.log("Undoing...");
            try {
                currentGameState = gameHistory.pop();
                renderBoard(currentGameState);
                updateUI();
                addToLog("--- Action Undone ---");
                btnUndo.disabled = gameHistory.length === 0;
            } catch (error) {
                console.error("Error restoring state:", error);
                alert("Undo Restore Error!");
                btnUndo.disabled = true;
            }
        } else {
            console.log("Nothing to undo.");
            btnUndo.disabled = true;
        }
    }

    // --- Find Pieces ---
    function findVampireById(vampId) {
        return currentGameState.board?.vampires?.find((v) => v.id === vampId);
    }
    function findPieceAtCoord(coord) {
        if (!currentGameState?.board) return null;
        const vamp = currentGameState.board.vampires?.find((v) => v.coord === coord);
        if (vamp) return { type: "vampire", piece: vamp };
        const bw = currentGameState.board.bloodwells?.find((b) => b.coord === coord);
        if (bw) return { type: "bloodwell", piece: bw };
        const hazard = currentGameState.board.hazards?.find((h) => h.coord === coord);
        if (hazard) return { type: "hazard", piece: hazard };
        return null;
    }

    // --- Action Execution Functions ---
    function executeMove(vampire, targetCoord) {
        if (!vampire) return false;
        const cost = AP_COST.MOVE;
        if (currentGameState.currentAP < cost) {
            addToLog("No AP.");
            return false;
        }
        // --- Add Lock-in Check Block Here ---
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
        if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
            console.log(`Non-Vigilante Lock-in: Set to ${vampire.id}`);
        }
        currentGameState.lastActionVampId = vampire.id; // Track last action vamp
        // --- End Lock-in Check Block ---
        if (vampire.cursed && (vampire.movesThisTurn || 0) >= 1) {
            addToLog(`Cursed ${vampire.id} already moved.`);
            return false;
        }
        const expectedTarget = getAdjacentCoord(vampire.coord, vampire.facing);
        if (targetCoord !== expectedTarget) {
            addToLog(`Invalid move target.`);
            return false;
        }
        const pieceAtTarget = findPieceAtCoord(targetCoord);
        if (pieceAtTarget && (pieceAtTarget.type === "vampire" || pieceAtTarget.type === "bloodwell" || pieceAtTarget.piece.type === "Black Widow")) {
            addToLog(`Blocked by ${pieceAtTarget.piece?.type || pieceAtTarget.type}.`);
            return false;
        }
        saveStateToHistory();
        const oldCoord = vampire.coord;
        vampire.coord = targetCoord;
        currentGameState.currentAP -= cost;
        vampire.movesThisTurn = (vampire.movesThisTurn || 0) + 1;
        addToLog(`${vampire.id} moved ${oldCoord} -> ${targetCoord}. (${currentGameState.currentAP} AP)`);
        // Inside executeMove function...
        // ... (code to check movement validity, save state, move vampire, deduct AP) ...
        const hazardLandedOn = currentGameState.board.hazards.find((h) => h.coord === targetCoord);
        if (hazardLandedOn?.type === "Grave Dust" && !vampire.cursed) {
            console.log("Curse by GD land.");
            const vampInState = findVampireById(vampire.id); // Get reference from state
            if (vampInState) {
                vampInState.cursed = true;
                // --- ADD THIS LINE ---
                vampInState.movesThisTurn = 0; // Reset move counter upon becoming cursed
                // --- END ADD ---
                addToLog(`${vampInState.id} CURSED by Grave Dust!`);
            } else {
                console.error("executeMove: Could not find vampire in state to apply curse!");
                addToLog(`ERROR: Failed to apply Curse from Grave Dust to ${vampire.id}`);
            }
        }
        // ... (Bloodbath cure check logic remains the same) ...
        if (vampire.cursed) {
            const landedOnHazard = !!hazardLandedOn;
            if (!landedOnHazard) {
                const adjacentCoords = getAllAdjacentCoords(targetCoord);
                let foundAdjacentBW = false;
                let adjacentBWCoord = null;
                for (const adjCoord of adjacentCoords) {
                    const pieceAtAdj = findPieceAtCoord(adjCoord);
                    if (pieceAtAdj?.type === "bloodwell" && pieceAtAdj.piece.player === vampire.player) {
                        foundAdjacentBW = true;
                        adjacentBWCoord = adjCoord;
                        break;
                    }
                }
                if (foundAdjacentBW) {
                    console.log("Bloodbath cure!");
                    vampire.cursed = false;
                    vampire.movesThisTurn = 0;
                    addToLog(`${vampire.id} CURED by Bloodbath near ${adjacentBWCoord}!`);
                }
            }
        }
        console.log(`Move End: ${vampire.id}, Cursed: ${vampire.cursed}, Moves: ${vampire.movesThisTurn}`);
        renderBoard(currentGameState);
        updateUI();
        return true;
    }
    function executePivot(vampire, newFacing) {
        if (!vampire || !DIRECTIONS.includes(newFacing)) return false;
        if (currentGameState.currentAP < AP_COST.PIVOT) {
            addToLog("No AP.");
            return false;
        }
        // --- Add Lock-in Check Block Here ---
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
        if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
            console.log(`Non-Vigilante Lock-in: Set to ${vampire.id}`);
        }
        currentGameState.lastActionVampId = vampire.id; // Track last action vamp
        // --- End Lock-in Check Block ---

        saveStateToHistory();
        vampire.facing = newFacing;
        currentGameState.currentAP -= AP_COST.PIVOT;
        addToLog(`${vampire.id} pivoted ${newFacing}. (${currentGameState.currentAP} AP)`);
        renderBoard(currentGameState);
        updateUI();
        return true;
    }
    /**
     * Executes a shot from the vampire.
     * Handles standard shots, Silver Bullets, and shots originating from abilities (like Rampage).
     * Includes checks for Sharpshooter and Marked Man passives.
     *
     * @param {object} vampire - The vampire object performing the shot.
     * @param {boolean} [isSilverBullet=false] - Whether this is a Silver Bullet shot.
     * @param {string | null} [overrideFacing=null] - Optional facing direction to use instead of vampire's current facing (for Rampage).
     * @param {number | null} [apCostOverride=null] - Optional AP cost to use instead of standard cost (use 0 for Rampage shots).
     * @returns {boolean} - True if the shot attempt was processed, false otherwise.
     */
    function executeShoot(vampire, isSilverBullet = false, overrideFacing = null, apCostOverride = null) {
        if (!vampire) {
            console.error("ExecuteShoot: No vampire provided.");
            return false;
        }

        // --- Determine AP Cost ---
        // Use override if provided (e.g., 0 for Rampage), otherwise use standard cost based on Silver Bullet
        const cost = apCostOverride ?? (isSilverBullet ? AP_COST.SILVER_BULLET : AP_COST.SHOOT);
        // ^ The '??' (Nullish Coalescing Operator) returns left side if it's NOT null/undefined, otherwise returns right side.
        console.log(`executeShoot: Determined cost = ${cost} (apCostOverride=${apCostOverride}, isSilverBullet=${isSilverBullet})`); // Debug Log

        // --- Basic validation checks ---
        // Check AP *unless* it's an override cost (like Rampage's free shots)
        if (apCostOverride === null && currentGameState.currentAP < cost) {
            addToLog(`Not enough AP to Shoot (Need ${cost}, Have ${currentGameState.currentAP}).`);
            return false;
        }
        // Check AP even for override if cost > 0 (though currently only 0 override is used)
        else if (apCostOverride !== null && apCostOverride > 0 && currentGameState.currentAP < cost) {
            addToLog(`Not enough AP for Ability Shot (Need ${cost}, Have ${currentGameState.currentAP}).`);
            return false;
        }

        if (vampire.cursed) {
            addToLog("Cursed cannot shoot.");
            return false;
        }
        const playerResources = currentGameState.playerResources[vampire.player];
        if (isSilverBullet && playerResources.silverBullet <= 0) {
            // Check includes null/undefined check implicitly
            addToLog("No Silver Bullet left.");
            return false;
        }

        // --- Lock-in & Last Action Tracking ---
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
        // Set lock-in only if it's a standard player action (not an override like Rampage)
        if (apCostOverride === null && currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
            console.log(`Non-Vigilante Lock-in: Set to ${vampire.id} by Shoot`);
        }
        // Track last action only if it's a standard player action
        if (apCostOverride === null) {
            currentGameState.lastActionVampId = vampire.id;
        }
        // --- End Lock-in ---

        // --- Save State & Deduct AP ---
        // Only save history and deduct AP if it's a player-initiated action (not internal Rampage call)
        if (apCostOverride === null) {
            saveStateToHistory();
            currentGameState.currentAP -= cost; // Deduct the calculated cost
            if (isSilverBullet) {
                playerResources.silverBullet--; // Deduct Silver Bullet resource
            }
        } else {
            // If called by Rampage (apCostOverride is 0), don't save history again or deduct AP here
            console.log("executeShoot called with apCostOverride=0, skipping AP deduction and history save.");
        }
        // --- End Save State & AP Deduction ---

        // --- Prepare Shot ---
        const shooterPlayerIndex = vampire.player;
        const shooterClass = currentGameState.players[shooterPlayerIndex].class;
        const facingToUse = overrideFacing || vampire.facing; // Use override facing if provided
        let currentCoord = vampire.coord;
        let hitMessage = `Shot from ${vampire.coord} facing ${facingToUse} travelled off board.`;
        let shotResolved = false;

        addToLog(`${vampire.id} shoots facing ${facingToUse}... ${isSilverBullet ? "(Silver Bullet)" : ""} ${apCostOverride !== null ? "(Part of Ability)" : ""}`);

        // --- Trace Path ---
        for (let i = 0; i < 9 && !shotResolved; i++) {
            const nextCoord = getAdjacentCoord(currentCoord, facingToUse); // Use facingToUse
            if (!nextCoord) {
                hitMessage = `Shot from ${vampire.coord} facing ${facingToUse} went off the board.`;
                shotResolved = true;
                break;
            }
            currentCoord = nextCoord;
            const pieceAtCoord = findPieceAtCoord(currentCoord);

            if (pieceAtCoord) {
                const targetType = pieceAtCoord.type;
                const targetPiece = pieceAtCoord.piece;

                // --- Hazard Interactions ---
                if (targetType === "hazard") {
                    if (targetPiece.type === "Tombstone") {
                        if (shooterClass === "Bounty Hunter") {
                            addToLog(`Shot passes through Tombstone at ${currentCoord} (Sharpshooter).`);
                            console.log(`BH Sharpshooter ignores Tombstone at ${currentCoord}. Shot continues.`);
                            continue; // Skip rest of loop iteration, shot continues
                        } else {
                            // Non-BH hits Tombstone
                            const vampBehind = findVampireById(targetPiece.coord) && targetPiece.player !== shooterPlayerIndex; // Simpler check
                            if (isSilverBullet && vampBehind) {
                                // Check vampBehind FIRST
                                hitMessage = `Silver Bullet shattered Tombstone at ${currentCoord}, but ${findVampireById(targetPiece.coord)?.id || "vampire"} was protected! (SB Wasted)`;
                                addToLog("Tombstone destroyed by blocked Silver Bullet.");
                            } else {
                                hitMessage = `Shot DESTROYED Tombstone at ${currentCoord}!`;
                            }
                            currentGameState.board.hazards = currentGameState.board.hazards.filter((h) => h.coord !== currentCoord);
                            shotResolved = true;
                            break; // Shot stops
                        }
                    } else if (targetPiece.type === "Dynamite") {
                        const initialExplosionCoord = currentCoord;
                        hitMessage = `Shot hit Dynamite at ${initialExplosionCoord}. It EXPLODES, starting potential chain reaction!`;
                        shotResolved = true;
                        console.log(`Dynamite hit by shot at ${initialExplosionCoord}. Initiating explosion processing.`);
                        addToLog(`Shot triggers Dynamite at ${initialExplosionCoord}!`);
                        const explosionQueue = [initialExplosionCoord];
                        const processedExplosions = new Set();
                        processExplosionQueue(explosionQueue, processedExplosions);
                        break; // Shot stops
                    } else if (targetPiece.type === "Black Widow") {
                        hitMessage = `Shot destroyed Black Widow at ${currentCoord}!`;
                        currentGameState.board.hazards = currentGameState.board.hazards.filter((h) => h.coord !== currentCoord);
                        shotResolved = true;
                        break; // Stop shot path
                    } else if (targetPiece.type === "Grave Dust") {
                        addToLog(`Shot passes through Grave Dust at ${currentCoord}.`);
                        continue; // Shot continues
                    }
                }
                // --- Piece Interactions ---
                else if (targetType === "vampire") {
                    // Case 1: Silver Bullet Hit Enemy
                    if (isSilverBullet && targetPiece.player !== shooterPlayerIndex) {
                        const eliminatedVampId = targetPiece.id;
                        const eliminatedVampPlayerIndex = targetPiece.player;
                        hitMessage = `Silver Bullet HIT & ELIMINATED enemy ${eliminatedVampId} at ${currentCoord}!`;
                        addToLog(hitMessage);
                        const eliminatedVampData = findVampireById(eliminatedVampId);
                        if (eliminatedVampData) currentGameState.eliminatedVampires.push(JSON.parse(JSON.stringify(eliminatedVampData)));
                        currentGameState.board.vampires = currentGameState.board.vampires.filter((v) => v.id !== eliminatedVampId);
                        // Defer render/UI until after loop break if part of Rampage? No, elimination needs immediate render.
                        renderBoard(currentGameState); // Render needed immediately for elimination visual
                        updateUI(); // Update UI needed immediately
                        let wasEliminated = false;
                        if (checkPlayerElimination(eliminatedVampPlayerIndex)) {
                            if (updateEliminationState(eliminatedVampPlayerIndex)) {
                                wasEliminated = true;
                            }
                        }
                        const gameEnded = checkGameEnd();
                        if (!gameEnded && wasEliminated) {
                            showEliminationPopup(eliminatedVampPlayerIndex);
                        }
                    }
                    // Case 2: Bounty Hunter Marked Man (Standard shot hitting Enemy)
                    else if (!isSilverBullet && shooterClass === "Bounty Hunter" && targetPiece.player !== shooterPlayerIndex) {
                        const targetVampInState = findVampireById(targetPiece.id);
                        if (targetVampInState && !targetVampInState.cursed) {
                            targetVampInState.cursed = true;
                            targetVampInState.movesThisTurn = 0;
                            hitMessage = `Shot HIT enemy ${targetPiece.id} at ${currentCoord}. Target is CURSED (Marked Man)!`;
                            addToLog(`Marked Man: ${targetPiece.id} is now CURSED!`);
                            renderBoard(currentGameState); // Render needed for curse visual
                            updateUI(); // Update UI needed
                        } else if (targetVampInState && targetVampInState.cursed) {
                            hitMessage = `Shot hit already cursed enemy ${targetPiece.id} at ${currentCoord}.`;
                            addToLog(hitMessage);
                        } else {
                            /* Error handling */
                        }
                    }
                    // Case 3: Any Other Vampire Hit
                    else {
                        hitMessage = `Shot hit ${targetPiece.id} at ${currentCoord} (no effect).`;
                        addToLog(hitMessage);
                    }
                    shotResolved = true; // Shot always stops on hitting a vampire
                    break;
                }
                // Case: Hit Bloodwell
                else if (targetType === "bloodwell") {
                    const targetBW = targetPiece;
                    const targetBWCoord = targetBW.coord;
                    const targetBWPlayerIndex = targetBW.player;
                    const targetBWId = targetBW.id;
                    let isProtectedBySheriff = false;
                    if (!isSilverBullet) {
                        // Check protection only for standard shots
                        const sheriffPlayerIndex = currentGameState.players.findIndex((p) => p.class === "Sheriff" && !p.eliminated);
                        if (sheriffPlayerIndex !== -1 && targetBWPlayerIndex === sheriffPlayerIndex) {
                            const activeSheriffVamps = currentGameState.board.vampires.filter((v) => v.player === sheriffPlayerIndex);
                            for (const sheriffVamp of activeSheriffVamps) {
                                const protectionZone = getCoordsInArea(sheriffVamp.coord, 1);
                                if (protectionZone.includes(targetBWCoord)) {
                                    isProtectedBySheriff = true;
                                    hitMessage = `Shot blocked! Sheriff's Bloodwell at ${targetBWCoord} is under protection!`;
                                    addToLog(hitMessage);
                                    break;
                                }
                            }
                        }
                    }

                    if (isProtectedBySheriff) {
                        shotResolved = true; // Stop shot
                        break;
                    } else {
                        // Not protected -> Destroy
                        hitMessage = `Shot DESTROYED Bloodwell ${targetBWId} at ${targetBWCoord}!`;
                        addToLog(hitMessage);
                        currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter((bw) => bw.id !== targetBWId);
                        // Defer render/UI if part of Rampage? No, BW destruction needs immediate render/checks
                        renderBoard(currentGameState);
                        updateUI();
                        let wasEliminated = false;
                        if (checkPlayerElimination(targetBWPlayerIndex)) {
                            if (updateEliminationState(targetBWPlayerIndex)) {
                                wasEliminated = true;
                            }
                        }
                        const gameEnded = checkGameEnd();
                        if (!gameEnded && wasEliminated) {
                            showEliminationPopup(targetBWPlayerIndex);
                        }

                        // *** Add Contract Payoff Trigger Check ***
                        if (shooterClass === "Bounty Hunter" && apCostOverride === null) {
                            // Check if BH made the shot via normal action
                            const bhResources = currentGameState.playerResources[shooterPlayerIndex];
                            if (bhResources.abilitiesUsed.includes("Contract Payoff Triggered")) {
                                // Check if ability active
                                let bonus = numberOfPlayers === 2 ? 3 : 5;
                                bhResources.contractPayoffNextTurnBonus = bonus; // Set bonus for next turn
                                addToLog(`Contract Payoff: Gaining +${bonus} AP next turn!`);
                                // Remove trigger? Or is the ability itself marked used? Assume mark used in execute func
                                // bhResources.abilitiesUsed = bhResources.abilitiesUsed.filter(a => a !== 'Contract Payoff Triggered');
                            }
                        }
                        // *** End Contract Payoff Check ***

                        // *** Add Outlaw Daring Escape Trigger Check ***
                        if (shooterClass === "Outlaw" && apCostOverride === null) {
                            // Check if Outlaw made shot via normal action
                            // TODO: Implement Daring Escape logic - needs state tracking (1/turn) and UI prompt/action later
                            addToLog("Outlaw Daring Escape may trigger (TBD).");
                        }
                        // *** End Daring Escape Check ***

                        shotResolved = true; // Stop shot
                        break;
                    }
                } // End Bloodwell Check
            } // end if(pieceAtCoord)
        } // end for loop (shot path)

        // --- Final Logging & UI Update ---
        // Final log message built from hitMessage within the loop
        const finalLogAPMsg = apCostOverride === null ? ` (${currentGameState.currentAP} AP left)` : " (Rampage Shot)";
        // Avoid double logging hit message if already logged (e.g. for protection)
        if (!hitMessage.startsWith("Shot blocked!")) {
            addToLog(hitMessage + finalLogAPMsg);
        }
        if (isSilverBullet && !shotResolved && hitMessage.includes("off board")) {
            addToLog("Silver Bullet did not hit anything before leaving board.");
        }

        // Update display *unless* called from Rampage (which handles final update)
        if (apCostOverride === null) {
            renderBoard(currentGameState);
            updateUI();
        }

        return true; // Indicate shot attempt occurred
    }

    function executeThrow(vampire, hazardType, targetCoord) {
        if (!vampire) return false;
        const cost = hazardType === "Dynamite" ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;
        if (currentGameState.currentAP < cost) {
            addToLog(`No AP.`);
            return false;
        }
        // --- Add Lock-in Check Block Here ---
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
        if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
            console.log(`Non-Vigilante Lock-in: Set to ${vampire.id}`);
        }
        currentGameState.lastActionVampId = vampire.id; // Track last action vamp
        // --- End Lock-in Check Block ---

        if (vampire.cursed) {
            addToLog("Cursed cannot throw.");
            return false;
        }
        if (!currentGameState.hazardPool || (currentGameState.hazardPool[hazardType] || 0) <= 0) {
            addToLog(`No ${hazardType}.`);
            return false;
        }
        const dist = getDistance(vampire.coord, targetCoord);
        if (dist === 0 || dist > 3) {
            addToLog(`Bad distance.`);
            return false;
        }
        const targetPiece = findPieceAtCoord(targetCoord);
        if (targetPiece && !(hazardType === "Grave Dust" && targetPiece.type === "vampire")) {
            addToLog(`Target blocked.`);
            return false;
        }
        /* TODO: Path validation */ saveStateToHistory();
        currentGameState.hazardPool[hazardType]--;
        currentGameState.board.hazards.push({
            type: hazardType,
            coord: targetCoord,
        });
        currentGameState.currentAP -= cost;
        addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP)`);
        if (hazardType === "Grave Dust" && targetPiece?.type === "vampire") {
            const targetV = findVampireById(targetPiece.piece.id);
            if (targetV && !targetV.cursed) {
                targetV.cursed = true;
                addToLog(`${targetV.id} CURSED by GD!`);
            }
        }
        renderBoard(currentGameState);
        updateUI();
        return true;
    }

    /**
     * Executes the Dispel action: Removes Grave Dust from the vampire's current square.
     * @param {object} vampire - The vampire object performing the action (from findVampireById).
     * @returns {boolean} - True if the action was successful, false otherwise.
     */
    function executeDispel(vampire) {
        if (!vampire) {
            console.error("executeDispel called without vampire object");
            return false;
        }
        const cost = AP_COST.DISPEL;

        // --- Add Lock-in Check Block Here ---
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
        if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
            console.log(`Non-Vigilante Lock-in: Set to ${vampire.id}`);
        }
        currentGameState.lastActionVampId = vampire.id; // Track last action vamp
        // --- End Lock-in Check Block ---

        // 1. Check AP
        if (currentGameState.currentAP < cost) {
            addToLog("Not enough AP to Dispel.");
            return false;
        }

        // 2. Find Grave Dust hazard specifically on the vampire's current square
        const hazardIndex = currentGameState.board.hazards.findIndex((h) => h.coord === vampire.coord && h.type === "Grave Dust");

        // 3. Check if Grave Dust was actually found
        if (hazardIndex === -1) {
            addToLog(`Cannot Dispel: No Grave Dust found at ${vampire.coord}.`);
            return false; // Action fails, no AP cost
        }

        // --- Action is Valid: Proceed ---
        console.log(`Executing Dispel for ${vampire.id} at ${vampire.coord}`);
        saveStateToHistory(); // Save state before modifying

        // 4. Remove the Grave Dust from the board state hazards array
        const removedHazard = currentGameState.board.hazards.splice(hazardIndex, 1)[0];
        console.log("Dispelled hazard:", removedHazard);

        // 5. Deduct AP cost
        currentGameState.currentAP -= cost;

        // 6. Log the action
        addToLog(`${vampire.id} Dispelled Grave Dust at <span class="math-inline">\{vampire\.coord\}\. \(</span>{currentGameState.currentAP} AP left)`);

        // 7. Update the display
        renderBoard(currentGameState);
        updateUI(); // Updates AP and potentially button states if needed

        return true; // Action successful
    }

    /**
     * Executes the Bite the Fuse action: Removes Dynamite from the vampire's current square and Curses the vampire.
     * @param {object} vampire - The vampire object performing the action (from findVampireById).
     * @returns {boolean} - True if the action was successful, false otherwise.
     */
    function executeBiteFuse(vampire) {
        if (!vampire) {
            console.error("executeBiteFuse called without vampire object");
            return false;
        }
        // --- Add Lock-in Check Block Here ---
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
        if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
            console.log(`Non-Vigilante Lock-in: Set to ${vampire.id}`);
        }
        currentGameState.lastActionVampId = vampire.id; // Track last action vamp
        // --- End Lock-in Check Block ---

        const cost = AP_COST.BITE_FUSE;

        // 1. Check AP
        if (currentGameState.currentAP < cost) {
            addToLog("Not enough AP to Bite the Fuse.");
            return false;
        }

        // (Assuming cursed players *can* Bite Fuse based on previous analysis)

        // 2. Find Dynamite hazard specifically on the vampire's current square
        const hazardIndex = currentGameState.board.hazards.findIndex((h) => h.coord === vampire.coord && h.type === "Dynamite");

        // 3. Check if Dynamite was actually found
        if (hazardIndex === -1) {
            addToLog(`Cannot Bite the Fuse: No Dynamite found at ${vampire.coord}.`);
            return false; // Action fails, no AP cost
        }

        // --- Action is Valid: Proceed ---
        console.log(`Executing Bite Fuse for ${vampire.id} at ${vampire.coord}`);
        saveStateToHistory(); // Save state before modifying

        // 4. Remove the Dynamite from the board state hazards array
        const removedHazard = currentGameState.board.hazards.splice(hazardIndex, 1)[0];
        console.log("Removed hazard by biting fuse:", removedHazard);

        // 5. Deduct AP cost
        currentGameState.currentAP -= cost;

        // 6. Apply Curse to the vampire (Modify the object within currentGameState)
        const vampInState = findVampireById(vampire.id);
        if (vampInState) {
            vampInState.cursed = true; // Apply the curse
            // --- ADD THIS LINE ---
            vampInState.movesThisTurn = 0; // Reset move counter upon becoming cursed
            // --- END ADD ---
            addToLog(`${vampInState.id} Bit the Fuse at <span class="math-inline">\{vampInState\.coord\}, removing Dynamite and becoming CURSED\! \(</span>{currentGameState.currentAP} AP left)`);
        } else {
            console.error("executeBiteFuse Error: Could not find vampire in state array to apply curse!");
            addToLog(`ERROR: Failed to apply Curse effect after Bite Fuse by ${vampire.id}`);
        }

        // 7. Update the display
        renderBoard(currentGameState); // Show curse border, remove hazard
        updateUI(); // Update AP, potentially button states

        return true; // Action successful
    }

    /**
     * Called when the current player clicks "End Turn".
     * Checks for end-of-turn abilities like Swift Justice before proceeding to the next player.
     */
    /**
     * Called when the current player clicks "End Turn".
     * Checks for end-of-turn abilities like Swift Justice before proceeding to the next player.
     */
    function nextTurn() {
        // 1. Check for pending actions (like throw target selection)
        if (currentGameState.actionState?.pendingAction) {
            addToLog("Cannot end turn: Action pending. Cancel or complete.");
            return; // Stop if an action hasn't fully resolved
        }

        // 2. Identify the player whose turn is ending
        const endingPlayerIndex = currentGameState.currentPlayerIndex;
        const endingPlayer = currentGameState.players[endingPlayerIndex];
        // Get the ID of the last vampire that performed an AP-costing action this turn
        const potentialSwiftJusticeVampId = currentGameState.lastActionVampId;

        let swiftJusticeTriggered = false; // Flag to check if we paused for SJ input

        // 3. Check if Swift Justice *can* be triggered
        // Conditions: Player is Sheriff, not eliminated, took an action with one of their vamps, that vamp isn't cursed.
        if (endingPlayer?.class === "Sheriff" && !endingPlayer.eliminated && potentialSwiftJusticeVampId) {
            const lastVamp = findVampireById(potentialSwiftJusticeVampId);
            // Ensure the last acted vampire exists, belongs to the Sheriff, and is not cursed
            if (lastVamp && lastVamp.player === endingPlayerIndex && !lastVamp.cursed) {
                // 4. Prompt the player
                if (confirm(`Execute Swift Justice for ${lastVamp.id}? (Move 1 square free)`)) {
                    // --- Player chose YES ---
                    isSwiftJusticeMovePending = true; // Set the global flag
                    swiftJusticePlayerIndex = endingPlayerIndex; // Store who is doing it
                    swiftJusticeVampId = potentialSwiftJusticeVampId; // Store which vamp is doing it

                    addToLog(`Sheriff ${lastVamp.id} prepares Swift Justice. Select move direction (N, E, S, W).`);
                    updateUI(); // Update UI (might highlight D-pad or show status)

                    // IMPORTANT: Pause here! Do not proceed to next player yet.
                    // Execution will continue when a direction button is clicked (via executeSwiftJusticeMove).
                    swiftJusticeTriggered = true; // Mark that we paused
                } else {
                    // --- Player chose NO ---
                    addToLog("Sheriff declined Swift Justice.");
                    // Don't set the flag, just proceed normally below.
                }
            } else {
                // Log why SJ wasn't offered (e.g., last vamp cursed, or ID mismatch)
                if (!lastVamp) console.warn("Swift Justice check failed: Last acted vamp not found?");
                else if (lastVamp.player !== endingPlayerIndex) console.warn("Swift Justice check failed: Last acted vamp belongs to wrong player?");
                else if (lastVamp.cursed) addToLog("Swift Justice cannot be performed by a cursed Sheriff.");
                // Proceed normally below.
            }
        } // else: Not a Sheriff or other conditions failed, proceed normally below.

        // 5. Proceed to next player IF Swift Justice wasn't triggered/paused
        if (!swiftJusticeTriggered) {
            // Save the final state of the ended turn *before* transitioning
            saveStateToHistory();
            // Transition to the next player's turn (this function handles resets etc.)
            proceedToNextPlayerTurn();
        }
        // If swiftJusticeTriggered is true, this function effectively ends here,
        // waiting for the player's directional input.
    }

    /**
     * Executes the Sheriff's Swift Justice move.
     * Moves the specified vampire 1 square in the chosen direction AND updates facing.
     * Costs 0 AP. Checks for landing effects. Proceeds to next turn after completion.
     * @param {string} direction - 'N', 'E', 'S', or 'W'.
     */
    function executeSwiftJusticeMove(direction) {
        if (!isSwiftJusticeMovePending || !swiftJusticeVampId) {
            console.error("executeSwiftJusticeMove called incorrectly - state not pending or vampId missing.");
            isSwiftJusticeMovePending = false; // Reset flag to prevent getting stuck
            proceedToNextPlayerTurn(); // Try to recover by just proceeding
            return;
        }

        const vampire = findVampireById(swiftJusticeVampId);
        if (!vampire) {
            console.error("Swift Justice Error: Could not find vampire ID:", swiftJusticeVampId);
            isSwiftJusticeMovePending = false;
            proceedToNextPlayerTurn(); // Abort and go to next turn
            return;
        }
        // Double check eligibility (not cursed) right before moving
        if (vampire.cursed) {
            addToLog(`Swift Justice cannot be performed by a cursed Sheriff (${vampire.id}). Aborting.`);
            isSwiftJusticeMovePending = false;
            swiftJusticePlayerIndex = -1;
            swiftJusticeVampId = null;
            proceedToNextPlayerTurn(); // Abort and go to next turn
            return;
        }

        // 1. Calculate Target Coordinate
        const targetCoord = getAdjacentCoord(vampire.coord, direction);

        // 2. Validate Target
        if (!isValidSwiftJusticeTarget(targetCoord, vampire.id)) {
            addToLog(`Invalid Swift Justice move target: ${targetCoord || "Off-board"}. Choose another direction.`);
            return; // Keep waiting for valid input, DO NOT proceed to next turn yet.
        }

        // --- Move is Valid ---
        console.log(`Executing Swift Justice move for ${vampire.id} to ${targetCoord} facing ${direction}`);
        saveStateToHistory(); // Save state *before* the Swift Justice move

        // Get reference to vampire in current state for modification
        const vampInState = findVampireById(vampire.id);
        if (!vampInState) {
            console.error("Swift Justice Error: Failed to get vampire reference in state!");
            isSwiftJusticeMovePending = false; // Abort cleanly
            proceedToNextPlayerTurn();
            return;
        }

        const originalCoord = vampInState.coord;
        vampInState.coord = targetCoord; // Move the vampire
        vampInState.facing = direction; // Update facing to match move direction

        addToLog(`Sheriff ${vampInState.id} executed Swift Justice: ${originalCoord} -> ${targetCoord}, facing ${direction}. (0 AP)`);

        // 3. Check Post-Move Effects (like landing on Grave Dust or near Bloodwell)
        checkSwiftJusticeMoveEndEffects(vampInState); // Check for curse/cure

        // 4. Clean up Swift Justice state
        isSwiftJusticeMovePending = false;
        swiftJusticePlayerIndex = -1;
        swiftJusticeVampId = null;

        // 5. Update Display
        renderBoard(currentGameState);
        updateUI(); // Important to update button states etc.

        // 6. Proceed to the actual next player's turn
        proceedToNextPlayerTurn();
    }

    /**
     * Executes the Outlaw's Rampage ability. Costs 2 AP, 1/game.
     * Fires two standard shots simultaneously Left and Right relative to current facing.
     * Uses the modified executeShoot with 0 AP cost override for the individual shots.
     * @param {object} vampire - The Outlaw vampire performing the action.
     * @returns {boolean} - True if action successful, false otherwise.
     */
    function executeRampage(vampire) {
        if (!vampire || currentGameState.players[vampire.player]?.class !== "Outlaw") {
            console.error("executeRampage called incorrectly (not Outlaw or no vampire).");
            return false;
        }
        const cost = AP_COST.RAMPAGE;
        const abilityName = "Rampage";
        const playerResources = currentGameState.playerResources[vampire.player]; // Get resources for THIS player

        // 1. Check AP
        if (currentGameState.currentAP < cost) {
            addToLog("Not enough AP for Rampage.");
            return false;
        }
        // 2. Check 1/Game Use
        if (playerResources.abilitiesUsed.includes(abilityName)) {
            addToLog("Rampage already used this game.");
            return false;
        }
        // 3. Check if Cursed
        if (vampire.cursed) {
            addToLog("Cannot use Rampage while cursed.");
            return false;
        }

        // --- Action is Valid - Proceed ---
        console.log(`Executing Rampage for ${vampire.id}`);
        saveStateToHistory(); // Save state before Rampage action

        // 4. Deduct AP & Mark Used
        currentGameState.currentAP -= cost;
        playerResources.abilitiesUsed.push(abilityName);
        addToLog(`${vampire.id} uses RAMPAGE! Firing Left & Right... (${currentGameState.currentAP} AP left)`);

        // 5. Set Lock-in and Last Action Vamp (if not already locked)
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class; // Should be Outlaw here
        if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
            console.log(`Non-Vigilante Lock-in: Set to ${vampire.id} by Rampage`);
        }
        currentGameState.lastActionVampId = vampire.id; // Rampage counts as the last action

        // 6. Calculate Left/Right Facings relative to current facing
        const currentFacing = vampire.facing;
        const leftFacing = getNewFacing(currentFacing, "L");
        const rightFacing = getNewFacing(currentFacing, "R");

        // 7. Execute the two shots (pass overrideFacing and 0 cost override)
        // The executeShoot function will handle logging the path/hits of each shot.
        console.log(`Rampage: Firing Left (${leftFacing})`);
        executeShoot(vampire, false, leftFacing, 0); // Standard shot, Left, 0 AP cost

        console.log(`Rampage: Firing Right (${rightFacing})`);
        executeShoot(vampire, false, rightFacing, 0); // Standard shot, Right, 0 AP cost

        // 8. Update UI once after both shots are technically done processing
        // (renderBoard is called within executeShoot if apCostOverride is null, which isn't the case here)
        // We need a final render/update after both shots.
        renderBoard(currentGameState); // Update board with results of both shots
        updateUI(); // Update AP, button states (Rampage should now be disabled)

        return true; // Rampage action completed
    }

    /**
     * Checks if a target coordinate is valid for a Swift Justice move.
     * Cannot be off-board, occupied by another vampire, or an obstacle like Black Widow.
     * Allows moving onto hazards like Grave Dust or Dynamite (effects apply after).
     * @param {string | null} targetCoord - The coordinate to check, or null if off-board.
     * @param {string} movingVampId - The ID of the vampire attempting the move.
     * @returns {boolean} True if the target is valid, false otherwise.
     */
    function isValidSwiftJusticeTarget(targetCoord, movingVampId) {
        // Check if coordinate is on the board
        if (!targetCoord) {
            console.log("Swift Justice Validation Fail: Off board");
            return false;
        }

        // Check for pieces/hazards at the target coordinate
        const pieceAtTarget = findPieceAtCoord(targetCoord);

        if (pieceAtTarget) {
            // Cannot move onto a square occupied by another VAMPIRE
            if (pieceAtTarget.type === "vampire") {
                // No need to check ID, can't move onto ANY vamp square
                console.log(`Swift Justice Validation Fail: Blocked by Vampire ${pieceAtTarget.piece.id}`);
                return false;
            }
            // Cannot move onto a square occupied by a Black Widow
            if (pieceAtTarget.type === "hazard" && pieceAtTarget.piece.type === "Black Widow") {
                console.log("Swift Justice Validation Fail: Blocked by Black Widow");
                return false;
            }
            // Cannot move onto a square occupied by own/enemy Bloodwell
            if (pieceAtTarget.type === "bloodwell") {
                console.log("Swift Justice Validation Fail: Blocked by Bloodwell");
                return false;
            }
            // Allows moving onto Tombstone, Grave Dust, Dynamite (effects apply later)
        }

        // If no blocking piece found, it's a valid target
        return true;
    }

    /**
     * Checks and applies effects after a Swift Justice move completes.
     * Specifically checks for landing on Grave Dust or curing via Bloodbath.
     * @param {object} vampInState - The vampire object from currentGameState that just moved.
     */
    function checkSwiftJusticeMoveEndEffects(vampInState) {
        const hazardLandedOn = currentGameState.board.hazards.find((h) => h.coord === vampInState.coord);

        // Check for landing on Grave Dust (Curse)
        if (hazardLandedOn?.type === "Grave Dust" && !vampInState.cursed) {
            console.log("Curse by GD land (Swift Justice).");
            vampInState.cursed = true;
            vampInState.movesThisTurn = 0; // Reset moves upon getting cursed by SJ move
            addToLog(`${vampInState.id} CURSED by Grave Dust after Swift Justice!`);
        }

        // Check for Bloodbath cure (only if Cursed *before* this check)
        // Need a helper to check adjacency to ANY bloodwell and if square is hazard-free
        if (vampInState.cursed && !hazardLandedOn && isAdjacentToAnyBloodwell(vampInState.coord)) {
            console.log("Bloodbath cure! (Swift Justice)");
            vampInState.cursed = false;
            vampInState.movesThisTurn = 0; // Reset moves upon getting cured by SJ move
            addToLog(`${vampInState.id} CURED by Bloodbath after Swift Justice!`);
        }
        // Note: Does SJ cure reset moves? Assume yes for consistency with normal Bloodbath.
    }

    /**
     * Helper function to check if a coordinate is adjacent (incl diagonals) or on the same square as ANY Bloodwell.
     * @param {string} coord - The coordinate to check.
     * @returns {boolean} True if near at least one Bloodwell, false otherwise.
     */
    function isAdjacentToAnyBloodwell(coord) {
        const rc = getRowColFromCoord(coord);
        if (!rc) return false;

        for (let bw of currentGameState.board.bloodwells) {
            const bw_rc = getRowColFromCoord(bw.coord);
            if (bw_rc && Math.abs(rc.row - bw_rc.row) <= 1 && Math.abs(rc.col - bw_rc.col) <= 1) {
                // Found a bloodwell within the 3x3 area centered on coord
                return true;
            }
        }
        return false; // No bloodwells found nearby
    }

    /**
     * Handles the logic to advance to the next player's turn after all end-of-turn effects/choices are done.
     * Finds next active player, resets AP/state, updates UI.
     */
    function proceedToNextPlayerTurn() {
        console.log("Proceeding to next player's turn...");

        // --- Reset trackers for the new turn ---
        // Note: lastActionVampId is reset in nextTurn BEFORE the prompt now.
        // currentGameState.lastActionVampId = null; // Can likely remove this duplicate reset
        currentGameState.lockedInVampireIdThisTurn = null;
        // --- End Resets ---

        // --- Advance Player Index ---
        let nextPlayerIndex = (currentGameState.currentPlayerIndex + 1) % numberOfPlayers;
        let loopCheck = 0;

        while (currentGameState.players[nextPlayerIndex]?.eliminated && loopCheck < numberOfPlayers) {
            console.log(`nextTurn/proceed: Skipping P${nextPlayerIndex} because eliminated status is: ${currentGameState.players[nextPlayerIndex]?.eliminated}`);
            nextPlayerIndex = (nextPlayerIndex + 1) % numberOfPlayers;
            loopCheck++;
        }

        // Error check
        const activePlayers = currentGameState.players.filter((p) => !p.eliminated);
        if (activePlayers.length > 0 && loopCheck >= numberOfPlayers) {
            console.error("Error in proceedToNextPlayerTurn: Could not find next active player! State:", currentGameState);
            addToLog("Error advancing turn!");
            return;
        } else if (activePlayers.length === 0 && currentGameState.turn > 0) {
            console.log("proceedToNextPlayerTurn found no active players left. Game should have ended.");
            return;
        }

        // --- Set New Turn State ---
        const previousPlayerIndexForTurnIncrement = currentGameState.currentPlayerIndex;
        currentGameState.currentPlayerIndex = nextPlayerIndex;

        // Increment turn number if wrapped around
        if (currentGameState.currentPlayerIndex <= previousPlayerIndexForTurnIncrement && !(numberOfPlayers === 1 && currentGameState.currentPlayerIndex === previousPlayerIndexForTurnIncrement)) {
            if (currentGameState.turn > 0 || numberOfPlayers > 1) {
                currentGameState.turn++;
                console.log(`Advanced to Turn ${currentGameState.turn}`);
            }
        }

        // Set AP for the new player
        const playerIndex = currentGameState.currentPlayerIndex;
        if (currentGameState.turn === 1) {
            if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
            else if (numberOfPlayers === 3) currentGameState.currentAP = 6;
            else if (numberOfPlayers === 2) currentGameState.currentAP = 5;
            else currentGameState.currentAP = 5;
        } else {
            currentGameState.currentAP = 5;
        }
        // TODO: Vigilante Blood Brothers check

        // Reset other turn-specific state variables
        currentGameState.selectedVampireId = null;
        currentGameState.actionState = {
            pendingAction: null,
            selectedHazardType: null,
        };

        clearHighlights();
        if (movementBar) movementBar.classList.add("hidden");
        btnUndo.disabled = true;

        // Reset movesThisTurn for ALL vampires
        if (currentGameState.board?.vampires) {
            currentGameState.board.vampires.forEach((v) => (v.movesThisTurn = 0));
        }

        // Update UI for the new player
        renderBoard(currentGameState);
        updateUI(); // CRITICAL: Call updateUI *after* all state is set for the new turn

        // Log start of new turn
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        if (currentPlayer && !currentPlayer.eliminated) {
            addToLog(`--- Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP} ---`);
        } else {
            if (!currentPlayer) console.error("Could not find current player object for logging turn start.");
            else if (currentPlayer.eliminated) console.error(`ERROR: Started turn for already eliminated player: P${currentGameState.currentPlayerIndex} (${currentPlayer.name})`);
        }
    }

    // --- Event Listener Handlers ---
    function handleBoardClick(event) {
        const squareEl = event.target.closest(".grid-square");
        if (!squareEl) return;
        const coord = squareEl.dataset.coord;
        if (!currentGameState?.actionState) return;
        const pending = currentGameState.actionState.pendingAction;
        if (pending === "throw-select-target") {
            const type = currentGameState.actionState.selectedHazardType;
            const vamp = findVampireById(currentGameState.selectedVampireId);
            if (squareEl.classList.contains("valid-target")) executeThrow(vamp, type, coord);
            else addToLog("Invalid target. Throw cancelled.");
            currentGameState.actionState = {
                pendingAction: null,
                selectedHazardType: null,
            };
            clearHighlights();
        } else if (pending === "move-select-target") {
            const vamp = findVampireById(currentGameState.selectedVampireId);
            if (vamp && squareEl.classList.contains("valid-target")) executeMove(vamp, coord);
            else addToLog("Invalid target. Move cancelled.");
            currentGameState.actionState = { pendingAction: null };
            clearHighlights();
        } else {
            handleVampireSelection(event);
        }
    }
    // Handles selecting/deselecting a vampire
    /**
     * Handles clicks on the board, specifically selecting/deselecting vampires.
     * Prevents non-Vigilantes from switching vampires after locking in.
     * @param {Event} event - The click event.
     */
    /**
     * Handles clicks on the board, specifically selecting/deselecting vampires.
     * Prevents non-Vigilantes from switching vampires after locking in.
     * @param {Event} event - The click event.
     */
    function handleVampireSelection(event) {
        // This function is called when no other action (like throw target) is pending
        const clickedVampireElement = event.target.closest(".vampire");

        if (clickedVampireElement) {
            // Clicked directly on a vampire piece
            const vampireId = clickedVampireElement.dataset.id;
            const ownerIndex = parseInt(clickedVampireElement.dataset.player);

            // Check if it belongs to the current player
            if (ownerIndex === currentGameState.currentPlayerIndex) {
                // --- Lock-in Check for Non-Vigilantes ---
                const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
                const lockedVampId = currentGameState.lockedInVampireIdThisTurn;

                // If NOT Vigilante, AND a lock is set, AND trying to select the OTHER vamp
                if (currentPlayerClass !== "Vigilante" && lockedVampId && vampireId !== lockedVampId) {
                    addToLog(`Locked into controlling ${lockedVampId}. Cannot switch vampires this turn.`);
                    return; // PREVENT the selection change by exiting the function
                }
                // --- End Lock-in Check ---

                // If check passes (or is Vigilante), proceed with selection logic:
                if (currentGameState.selectedVampireId !== vampireId) {
                    console.log(`Selected vampire ${vampireId}`);
                    currentGameState.selectedVampireId = vampireId;
                    if (movementBar) movementBar.classList.remove("hidden"); // Show D-Pad
                    renderBoard(currentGameState); // Update selection highlight
                    updateUI(); // Update button states based on new selection
                }
            } else {
                // Clicked opponent's vampire
                addToLog("Cannot select opponent's vampire.");
                if (currentGameState.selectedVampireId) {
                    currentGameState.selectedVampireId = null;
                    if (movementBar) movementBar.classList.add("hidden");
                    renderBoard(currentGameState);
                    updateUI();
                }
            }
        } else if (event.target.closest(".grid-square")) {
            // Clicked on an empty square (or hazard/BW) - deselect current vampire
            if (!currentGameState.actionState?.pendingAction && currentGameState.selectedVampireId) {
                console.log("Deselecting vampire by clicking elsewhere.");
                currentGameState.selectedVampireId = null;
                if (movementBar) movementBar.classList.add("hidden");
                renderBoard(currentGameState);
                updateUI();
                clearHighlights();
            }
        }
    }

    // Listener for the OK button on the elimination popup
    const btnCloseElimination = document.getElementById("btn-close-elimination");
    if (btnCloseElimination) {
        btnCloseElimination.addEventListener("click", () => {
            popups.elimination.style.display = "none"; // Hide popup
            // After closing elimination, check again if the game ended (in case that elimination ended the game)
            checkGameEnd();
        });
    } else {
        console.warn("Elimination popup close button not found");
    }

    // Listener for the Restart button on the victory popup
    const btnRestartVictory = document.getElementById("btn-restart-victory");
    if (btnRestartVictory) {
        btnRestartVictory.addEventListener("click", () => {
            popups.victory.style.display = "none"; // Hide popup
            // Use the existing "Back to Setup" logic/button or create a full restart function
            addToLog("Restarting game...");
            // Option 1: Simulate click on the dev button
            // btnBackToSetup.click();
            // Option 2: Call initializeGame directly (if setup data is still valid) - Less clean reset
            // initializeGame();
            // Option 3: Reload the page (simplest full reset)
            window.location.reload();
        });
    } else {
        console.warn("Victory popup restart button not found");
    }

    // --- Functions for Throw Action ---
    function populateHazardPicker() {
        hazardPickerOptions.innerHTML = "";
        if (!currentGameState?.hazardPool || typeof currentGameState.currentAP === "undefined") {
            console.error("Cannot populate picker: Invalid state.");
            addToLog("Error prepping throw.");
            return;
        }

        const pool = currentGameState.hazardPool;
        const ap = currentGameState.currentAP;

        const createBtn = (type, icon, cost) => {
            const btn = document.createElement("button");
            btn.dataset.hazardType = type;
            const count = pool[type] || 0;
            btn.innerHTML = `<span class="hazard-icon">${icon}</span> ${type} <span class="hazard-cost">(${cost} AP)</span>`;
            btn.disabled = count <= 0 || ap < cost;
            btn.title = `${count} available`;
            hazardPickerOptions.appendChild(btn);
        };

        createBtn("Tombstone", "🪦", AP_COST.THROW_HAZARD);
        createBtn("Black Widow", "🕷️", AP_COST.THROW_HAZARD);
        createBtn("Grave Dust", "💩", AP_COST.THROW_HAZARD);
        createBtn("Dynamite", "💥", AP_COST.THROW_DYNAMITE);
    }

    function handleHazardSelection(hazardType) {
        console.log("Selected hazard:", hazardType);
        const cost = hazardType === "Dynamite" ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;

        if (!currentGameState?.hazardPool || !currentGameState.actionState) {
            return;
        }

        if ((currentGameState.hazardPool[hazardType] || 0) <= 0) {
            addToLog(`No ${hazardType}.`);
            return;
        }

        if (currentGameState.currentAP < cost) {
            addToLog(`Not enough AP.`);
            return;
        }

        currentGameState.actionState.pendingAction = "throw-select-target";
        currentGameState.actionState.selectedHazardType = hazardType;
        popups.hazardPicker.style.display = "none"; /* Use reference from popups object */
        highlightThrowTargets();
        addToLog(`Throwing ${hazardType}. Select target.`);
    }
    // Calculates and highlights valid squares for the selected throw action
    function highlightThrowTargets() {
        clearHighlights(); // Clear previous highlights first
        const selectedVamp = findVampireById(currentGameState?.selectedVampireId);

        // Ensure required state is available
        if (!selectedVamp || !currentGameState?.actionState?.selectedHazardType) {
            console.error("Cannot highlight throw targets: Missing selected vampire or hazard type.");
            return;
        }

        const startCoord = selectedVamp.coord;
        const facing = selectedVamp.facing;
        const hazardType = currentGameState.actionState.selectedHazardType;
        if (!startCoord || !facing || !hazardType) return; // Ensure we have needed info

        let currentPathCoord = startCoord; // Tracks the square check is moving from
        let pathClear = true; // Assume path is clear initially

        // Check squares 1, 2, and 3 steps away IN FACING DIRECTION
        for (let dist = 1; dist <= 3; dist++) {
            const targetCoord = getAdjacentCoord(currentPathCoord, facing);

            if (!targetCoord) {
                // Fell off the board
                pathClear = false; // Path is blocked by edge
                break; // Stop checking further
            }

            // If the path was already blocked by a piece on a previous iteration, stop.
            if (!pathClear) {
                console.log(`Path already blocked before reaching distance ${dist}`);
                break;
            }

            const pieceAtTarget = findPieceAtCoord(targetCoord);

            // Determine if THIS square is a valid LANDING spot
            let isValidLandingSpot = false;
            if (!pieceAtTarget) {
                // Empty is always a valid landing spot
                isValidLandingSpot = true;
            } else if (hazardType === "Grave Dust" && pieceAtTarget.type === "vampire") {
                // GD onto Vamp is valid
                isValidLandingSpot = true;
            } // All other occupied squares are invalid landing spots

            // Add highlight if it's a valid landing spot AND path was clear *up to this point*
            if (isValidLandingSpot) {
                const targetSquareElement = gameBoard.querySelector(`[data-coord="${targetCoord}"]`);
                if (targetSquareElement) {
                    targetSquareElement.classList.add("valid-target");
                    // console.log(`Highlighting ${targetCoord} as valid target.`); // Optional debug
                }
            } else {
                console.log(`Square ${targetCoord} is not a valid landing spot for ${hazardType}.`);
            }

            // Now check if the piece AT the target square blocks the path for *subsequent* squares
            // Updated Rule: Vampires, Bloodwells, Tombstones, Dynamite block the path.
            if (pieceAtTarget && (pieceAtTarget.type === "vampire" || pieceAtTarget.type === "bloodwell" || (pieceAtTarget.type === "hazard" && (pieceAtTarget.piece.type === "Tombstone" || pieceAtTarget.piece.type === "Dynamite")))) {
                console.log(`Path blocked at ${targetCoord} by ${pieceAtTarget.piece?.type || pieceAtTarget.type}. Stopping check beyond here.`);
                pathClear = false; // Path is blocked *beyond* this square
                // NOTE: We don't 'break' here immediately. We finish processing *this* square
                // (e.g., highlighting it if it was GD->Vamp), but the flag prevents
                // processing squares further away in the next iteration.
            }

            // Move "current path check" forward for the next iteration
            currentPathCoord = targetCoord;
        }
    }

    /**
     * Processes a queue of Dynamite explosion coordinates, handling chain reactions.
     * @param {string[]} explosionQueue - An array of coordinates where Dynamite needs to explode.
     * @param {Set<string>} processedExplosions - A Set tracking coordinates already exploded in this chain.
     */
    function processExplosionQueue(explosionQueue, processedExplosions) {
        let needsEliminationCheck = false; // Flag to check elimination after the whole chain

        // Keep processing as long as there are explosions queued up
        while (explosionQueue.length > 0) {
            const coordToExplode = explosionQueue.shift(); // Get the next coordinate from the front of the queue

            // 1. Skip if this coordinate has already exploded in this chain reaction
            if (processedExplosions.has(coordToExplode)) {
                console.log(`Skipping already processed explosion at ${coordToExplode}`);
                continue;
            }

            // 2. Mark this coordinate as processed for this chain
            processedExplosions.add(coordToExplode);

            // 3. Verify Dynamite still exists (might have been destroyed by a previous blast in the chain)
            const dynamitePieceInfo = findPieceAtCoord(coordToExplode);
            if (!dynamitePieceInfo || dynamitePieceInfo.type !== "hazard" || dynamitePieceInfo.piece.type !== "Dynamite") {
                console.log(`No Dynamite found at ${coordToExplode} (already destroyed?), skipping explosion.`);
                continue; // Skip if no dynamite is actually here anymore
            }

            // 4. It exists! Log and Remove the Dynamite
            console.log(`Exploding Dynamite at ${coordToExplode}`);
            addToLog(`Chain reaction: Dynamite EXPLODES at ${coordToExplode}!`);
            currentGameState.board.hazards = currentGameState.board.hazards.filter((h) => h.coord !== coordToExplode);

            // 5. Get the 3x3 blast area
            const explosionAreaCoords = getCoordsInArea(coordToExplode, 1);

            // 6. Process effects within the blast area
            explosionAreaCoords.forEach((coordInBlast) => {
                // Optional Rule Check: Should the center square be affected?
                // if (coordInBlast === coordToExplode) return; // Uncomment to skip the exact center

                const pieceInBlast = findPieceAtCoord(coordInBlast);

                if (pieceInBlast) {
                    const affectedPiece = pieceInBlast.piece;
                    const affectedType = pieceInBlast.type;

                    // Apply Effects based on what was hit in the blast
                    if (affectedType === "bloodwell") {
                        console.log(`Explosion destroyed Bloodwell ${affectedPiece.id} at ${coordInBlast}`);
                        addToLog(`Explosion destroyed Bloodwell ${affectedPiece.id} at ${coordInBlast}!`);
                        currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter((bw) => bw.id !== affectedPiece.id);
                        needsEliminationCheck = true; // Mark that we need to check eliminations later
                    }
                    // Check if it's a hazard AND it's NOT a dynamite that's already exploded in this chain
                    else if (affectedType === "hazard") {
                        if (affectedPiece.type === "Dynamite") {
                            // Found another Dynamite! Add it to the queue IF it hasn't been processed.
                            if (!processedExplosions.has(affectedPiece.coord)) {
                                // Only add if it hasn't already exploded its own radius
                                // Verification that it *still* exists isn't strictly needed here,
                                // the check at the start of the while loop handles that.
                                console.log(`Explosion triggers another Dynamite at ${affectedPiece.coord}. Adding to queue.`);
                                addToLog(`Explosion triggers nearby Dynamite at ${affectedPiece.coord}!`);
                                if (!explosionQueue.includes(affectedPiece.coord)) {
                                    // Avoid adding duplicates to queue
                                    explosionQueue.push(affectedPiece.coord);
                                }
                            }
                        } else {
                            // It's a different type of hazard (Tombstone, BW, GD)
                            console.log(`Explosion destroyed Hazard (${affectedPiece.type}) at ${coordInBlast}`);
                            addToLog(`Explosion destroyed Hazard (${affectedPiece.type}) at ${coordInBlast}!`);
                            currentGameState.board.hazards = currentGameState.board.hazards.filter((h) => h.coord !== affectedPiece.coord);
                        }
                    } else if (affectedType === "vampire") {
                        // TODO: Determine explosion effect on Vampires based on game rules
                        console.log(`Explosion hit Vampire ${affectedPiece.id} at ${coordInBlast}. (Effect TBD)`);
                        addToLog(`Explosion hit Vampire ${affectedPiece.id} at ${coordInBlast}. (Effect TBD)`);
                    }
                } // end if(pieceInBlast)
            }); // end forEach coordInBlast
        } // end while(explosionQueue.length > 0)

        console.log("Chain reaction processing complete.");

        // Re-render board once after all explosion effects applied
        renderBoard(currentGameState);
        updateUI();

        // Check eliminations caused by the chain reaction
        if (needsEliminationCheck) {
            console.log("Checking elimination status for all players after chain reaction.");
            addToLog("Checking player elimination status...");
            const newlyEliminatedIndexes = []; // Store players eliminated in this chain

            // First pass: Update state for all eliminated players
            for (let i = 0; i < currentGameState.players.length; i++) {
                if (!currentGameState.players[i].eliminated) {
                    // Only check active players
                    if (checkPlayerElimination(i)) {
                        if (updateEliminationState(i)) {
                            // Sets flag, removes pieces
                            newlyEliminatedIndexes.push(i);
                        }
                    }
                }
            }

            // Now, check if the game ended AFTER handling all potential eliminations
            const gameEnded = checkGameEnd(); // Shows victory popup if needed

            // If the game DID NOT end, show popups for players eliminated in this chain
            if (!gameEnded && newlyEliminatedIndexes.length > 0) {
                newlyEliminatedIndexes.forEach((eliminatedIndex) => {
                    showEliminationPopup(eliminatedIndex);
                    // Note: This could still show multiple popups if the chain eliminates multiple players simultaneously without ending the game (e.g., 4p -> 2p). This might be desired.
                });
            }
        } // end if(needsEliminationCheck)
    }

    /**
     * Checks if a specific player should be eliminated based on game state.
     * @param {number} playerIndex - The index of the player to check.
     * @returns {boolean} - True if the player is eliminated, false otherwise.
     */
    function checkPlayerElimination(playerIndex) {
        if (!currentGameState || !currentGameState.players[playerIndex] || currentGameState.players[playerIndex].eliminated) {
            return false; // Already eliminated or invalid index
        }

        const remainingVamps = currentGameState.board.vampires.filter((v) => v.player === playerIndex).length;
        const remainingBloodwells = currentGameState.board.bloodwells.filter((bw) => bw.player === playerIndex).length;

        console.log(`Checking P${playerIndex} (<span class="math-inline">\{currentGameState\.players\[playerIndex\]?\.name\}\)\: Vamps\=</span>{remainingVamps}, BWs=${remainingBloodwells}`);

        const isEliminated = remainingVamps === 0 || remainingBloodwells === 0;

        if (isEliminated) {
            console.log(`Player <span class="math-inline">\{playerIndex\} \(</span>{currentGameState.players[playerIndex].name}) elimination condition met.`);
        }

        return isEliminated;
    }

    /**
     * Updates the game state when a player is eliminated.
     * Sets the eliminated flag, logs it, and removes player's pieces from the board.
     * @param {number} playerIndex - The index of the player being eliminated.
     * @returns {boolean} - True if the state was updated, false otherwise (e.g., already eliminated).
     */
    function updateEliminationState(playerIndex) {
        if (!currentGameState || !currentGameState.players[playerIndex] || currentGameState.players[playerIndex].eliminated) {
            return false;
        }
        // Get the player object *within this function*
        const player = currentGameState.players[playerIndex];
        if (!player) {
            // Check if player exists at that index
            console.error(`updateEliminationState: Invalid playerIndex ${playerIndex}, cannot find player.`);
            return false;
        }
        const playerName = player.name; // Get name from the fetched object

        // CORRECTED CONSOLE LOG: Uses the correct playerName variable
        console.log(`Updating elimination state for P${playerIndex} (${playerName}). Setting eliminated = true.`);

        currentGameState.players[playerIndex].eliminated = true;
        console.log(`P${playerIndex} (${playerName}) eliminated flag is now: ${currentGameState.players[playerIndex].eliminated}`);
        console.log("Player state object after setting flag:", JSON.stringify(currentGameState.players[playerIndex]));

        addToLog(`--- PLAYER ELIMINATED: ${playerName} ---`);

        // CORRECTED CONSOLE LOG: Uses the correct playerIndex for the message
        console.log(`Removing remaining pieces for P${playerIndex}.`);
        currentGameState.board.vampires = currentGameState.board.vampires.filter((v) => v.player !== playerIndex);
        currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter((bw) => bw.player !== playerIndex);

        return true;
    }

    /**
     * Displays the "Player Eliminated!" popup for a given player.
     * @param {number} playerIndex - The index of the player eliminated.
     */
    function showEliminationPopup(playerIndex) {
        console.log("--- showEliminationPopup START ---");
        console.log("showEliminationPopup received playerIndex:", playerIndex);

        const player = currentGameState.players[playerIndex];
        console.log("Fetched player object:", JSON.stringify(player));

        if (!player) {
            console.error(`Cannot show elimination popup: Invalid playerIndex ${playerIndex} or player data missing.`);
            return;
        }

        const playerName = player.name;
        const playerClass = player.class;
        console.log(`Extracted Name: ${playerName}, Extracted Class: ${playerClass}`);

        const elimPopup = popups.elimination;
        const elimMsg = document.getElementById("elimination-message");
        if (elimPopup && elimMsg) {
            console.log(`Attempting to set popup text for P${playerIndex} with Name='${playerName}' and Class='${playerClass}'`);

            // --- Use Template Literal (Backticks ``) ---
            // Make sure to use the backtick character (`), NOT a single quote (')
            elimMsg.textContent = `${playerName} (${playerClass}) has been eliminated!`;
            // --- End Template Literal ---

            elimPopup.style.display = "flex"; // Show the popup
        } else {
            console.error("Elimination popup elements ('popup-elimination' or 'elimination-message') not found!");
        }
        console.log("--- showEliminationPopup END ---");
    }

    /**
     * Checks if the game has ended (only one player left) and handles victory.
     * @returns {boolean} - True if the game has ended, false otherwise.
     */
    function checkGameEnd() {
        if (!currentGameState || !currentGameState.players) return false;

        const activePlayers = currentGameState.players.filter((p) => !p.eliminated);

        if (activePlayers.length === 1) {
            // Game Over - We have a winner!
            const winner = activePlayers[0];
            console.log(`Game Over! Winner: ${winner.name}`); // Check console log too
            addToLog(`*** GAME OVER! ${winner.name} (${winner.class}) WINS! ***`);

            // Display victory popup
            const victoryPopup = popups.victory;
            const victoryMsg = document.getElementById("victory-message");

            // --- Possible Issue Area ---
            if (victoryPopup && victoryMsg) {
                // Add this console log to check the winner object right before setting text:
                console.log("Populating victory popup. Winner object:", winner);

                // Ensure you are using backticks ` ` for the template literal
                victoryMsg.textContent = `${winner.name} (${winner.class}) claims the Dreadwood!`;

                victoryPopup.style.display = "flex";
            } else {
                console.error("Victory popup elements not found!");
            }
            // --- End Possible Issue Area ---

            btnEndTurn.disabled = true;
            return true; // Game has ended
        } else if (activePlayers.length === 0) {
            // Should not happen with "last faction standing" rule, but handle defensively
            console.log("Game Over! No active players left? Draw?");
            addToLog("*** GAME OVER! DRAW? (No players left) ***");
            // TODO: Handle draw scenario if needed by rules, maybe show a different popup?
            return true; // Game has ended (in a weird state)
        }

        return false; // Game continues
    }

    // --- Initialization ---
    function initializeGame() {
        console.log("Entering initializeGame. playerData:", JSON.stringify(playerData)); // <-- ADD THIS
        console.log("Initializing game...");
        // ... rest of function
        gameHistory = [];

        const layouts = LAYOUT_DATA[numberOfPlayers]; // Get the array of layouts for this player count
        if (!layouts?.length) {
            alert(`Error: No layouts defined for ${numberOfPlayers} players!`);
            showScreen("playerCount");
            return;
        }
        // This line correctly picks a random index from the available layouts:
        const layoutIdx = Math.floor(Math.random() * layouts.length);
        const layout = layouts[layoutIdx]; // Select the random layout
        const layoutName = `${numberOfPlayers}P Layout #${layoutIdx + 1}`; // For logging
        console.log(`Selected ${layoutName}`);

        currentGameState = {
            players: playerData.map((p) => ({
                name: p.name,
                class: p.class,
                eliminated: false,
            })),
            board: {
                vampires: JSON.parse(
                    JSON.stringify(
                        layout.vampires.map((v) => ({
                            ...v,
                            cursed: false,
                            movesThisTurn: 0,
                        }))
                    )
                ), // << Comma IS needed here
                bloodwells: JSON.parse(JSON.stringify(layout.bloodwells)), // << Comma IS needed here
                hazards: JSON.parse(JSON.stringify(layout.hazards)), // << NO comma needed here
            }, // << Comma IS needed here before hazardPool
            hazardPool: {
                Tombstone: 5 - layout.hazards.filter((h) => h.type === "Tombstone").length,
                "Black Widow": 5 - layout.hazards.filter((h) => h.type === "Black Widow").length,
                "Grave Dust": 5 - layout.hazards.filter((h) => h.type === "Grave Dust").length,
                Dynamite: 3,
            },
            playerResources: playerData.map(() => ({
                silverBullet: 1,
                abilitiesUsed: [],
                wasShotSinceLastTurn: false, // For Vigilante Vengeance trigger
                contractPayoffNextTurnBonus: 0, // AP bonus for BH next turn
                vengeanceNextTurnBonus: 0, // AP bonus for Vigilante next turn
            })),
            turn: 1,
            currentPlayerIndex: 0,
            currentAP: 0,
            selectedVampireId: null,
            actionState: {
                pendingAction: null,
                selectedHazardType: null,
            },
            lockedInVampireIdThisTurn: null,
            lastActionVampId: null,
            actionState: { pendingAction: null, selectedHazardType: null },
            eliminatedVampires: [], // Global list to track for Sheriff revive
        };

        const pIdx = currentGameState.currentPlayerIndex;
        if (currentGameState.turn === 1) {
            if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][pIdx];
            else if (numberOfPlayers === 3) currentGameState.currentAP = 6;
            else if (numberOfPlayers === 2) currentGameState.currentAP = 5;
            else currentGameState.currentAP = 5;
        }

        console.log(`*** Calculated Initial AP: ${currentGameState.currentAP} (for player index ${pIdx}, num players ${numberOfPlayers}) ***`);

        generateGrid();
        renderBoard(currentGameState);

        // Inside initializeGame...
        const player = currentGameState.players[pIdx];
        if (!player) {
            console.error("Init fail: Player not found at index", pIdx);
            return;
        } // Safety check
        const resources = currentGameState.playerResources[pIdx];
        if (!resources) {
            console.error("Init fail: Resources not found at index", pIdx);
            return;
        } // Safety check

        // --- ADD THIS LOG ---
        console.log("Data FOR updatePlayerInfoPanel:", {
            pIdx: pIdx,
            player: player,
            resources: resources,
            turn: currentGameState.turn,
            ap: currentGameState.currentAP,
        });
        // --- END LOG ---

        updatePlayerInfoPanel(player, currentGameState.turn, currentGameState.currentAP, resources);
        // ... rest of function

        logList.innerHTML = `<li>Game Started: ${layoutName}</li>`;
        gameLog.scrollTop = 0;
        btnUndo.disabled = true;

        if (movementBar) movementBar.classList.add("hidden");

        gameBoard.removeEventListener("click", handleBoardClick);
        gameBoard.addEventListener("click", handleBoardClick);
        btnUndo.removeEventListener("click", undoLastAction);
        btnUndo.addEventListener("click", undoLastAction);
        btnEndTurn.removeEventListener("click", nextTurn);
        btnEndTurn.addEventListener("click", nextTurn);

        showScreen("gameplay");
        addToLog(`--- Turn ${currentGameState.turn} - ${player.name}'s turn (${player.class}). AP: ${currentGameState.currentAP} ---`);
    }
    // --- 5. Attach Event Listeners (Executed ONCE on script load) --- // Note: Original numbering kept, this is Section 4 of pasting

    // Setup Screens Listeners
    playerCountButtons.forEach((button) => {
        button.addEventListener("click", () => {
            numberOfPlayers = parseInt(button.dataset.count);
            playerData = new Array(numberOfPlayers); // Create array for player data
            selectedClasses = []; // Reset selections for new setup process
            updatePlayerSetupScreen(0); // Setup screen for Player 1 (index 0)
            showScreen("playerSetup");
        });
    });

    // Listener for the new "Back to Start" button
    if (btnBackToStart) {
        // Check if the button exists
        btnBackToStart.addEventListener("click", () => {
            if (confirm("Return to player count selection? All setup progress will be lost.")) {
                // Reset setup state completely
                numberOfPlayers = 0;
                currentPlayerSetupIndex = 0;
                playerData = [];
                selectedClasses = [];
                // Hide player setup and show player count screen
                showScreen("playerCount");
                console.log("Returned to player count screen. Setup state reset.");
            }
        });
    }

    // --- Event Listeners for Dispel and Bite Fuse ---

    // Listener for the Dispel button
    btnDispel?.addEventListener("click", () => {
        const selectedVampireObject = findVampireById(currentGameState?.selectedVampireId); // Get the selected vamp object
        if (selectedVampireObject) {
            executeDispel(selectedVampireObject); // Call the function
        } else {
            addToLog("Select a Vampire to Dispel."); // Log if no vampire selected
        }
    });

    // Listener for the Bite the Fuse button
    btnBiteFuse?.addEventListener("click", () => {
        const selectedVampireObject = findVampireById(currentGameState?.selectedVampireId); // Get the selected vamp object
        if (selectedVampireObject) {
            executeBiteFuse(selectedVampireObject); // Call the function
        } else {
            addToLog("Select a Vampire to Bite Fuse."); // Log if no vampire selected
        }
    });

    // Listener for the Rampage button
    btnRampage?.addEventListener("click", () => {
        const selectedVampireObject = findVampireById(currentGameState?.selectedVampireId);
        if (selectedVampireObject) {
            // Make sure it's actually an Outlaw before executing
            if (currentGameState.players[selectedVampireObject.player]?.class === "Outlaw") {
                executeRampage(selectedVampireObject);
            } else {
                addToLog("Only Outlaws can Rampage.");
            }
        } else {
            addToLog("Select an Outlaw Vampire to use Rampage.");
        }
    });

    // Help Button Listener
    if (btnHelp) {
        btnHelp.addEventListener("click", () => {
            console.log("Help button clicked");
            // Show the popup first
            showScreen("howToPlay"); // Should use popups['howToPlay'].style.display = 'flex'; from revised showScreen

            // Find the scrollable content area inside the popup
            const howToPlayContent = popups.howToPlay?.querySelector(".how-to-play-content");

            // Reset its scroll position to the top
            if (howToPlayContent) {
                howToPlayContent.scrollTop = 0;
                console.log("Reset How-to-Play scroll position.");
            }
        });
    }

    // Back from How-to-Play Listener (Simpler - Just Hide Popup)
    if (btnBackToGame) {
        btnBackToGame.addEventListener("click", () => {
            console.log("Back to Game button clicked, hiding HowToPlay popup.");
            if (popups.howToPlay) {
                popups.howToPlay.style.display = "none"; // Hide the popup
            }
            // The underlying screen (stored in lastActiveScreenId) should still be active.
        });
    }
    // Movement D-Pad Button Listeners (NEW)
    // Helper function to handle clicks on any movement arrow
    const handleMovementButtonClick = (direction) => {
        console.log(`Movement button clicked: ${direction}`); // For debugging
        // Ensure game state is ready
        if (!currentGameState || !currentGameState.board || !currentGameState.players) {
            console.error("Movement click failed: Game state not ready.");
            return;
        }
        // Find the selected vampire
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        if (!selectedVamp) {
            addToLog("Select a Vampire first.");
            return;
        }

        // Check if the clicked direction matches the vampire's current facing
        if (direction === selectedVamp.facing) {
            // --- Attempt MOVE action ---
            addToLog(`Attempting Move ${direction}...`);
            const targetCoord = getAdjacentCoord(selectedVamp.coord, selectedVamp.facing);
            if (targetCoord) {
                // executeMove function handles AP checks, validation, state change, rendering, UI update
                executeMove(selectedVamp, targetCoord);
            } else {
                addToLog("Cannot move forward off the board.");
            }
        } else {
            // --- Attempt PIVOT action ---
            addToLog(`Attempting Pivot to ${direction}...`);
            // executePivot function handles AP checks, state change, rendering, UI update
            executePivot(selectedVamp, direction);
        }
    };

    // --- Example D-Pad Button Handler ---

    const handleDirectionButtonClick = (direction) => {
        // *** ADD THIS CHECK AT THE VERY BEGINNING ***
        console.log(`D-Pad Click: ${direction}. Swift Justice Pending? ${isSwiftJusticeMovePending}`); // Debug log
        if (isSwiftJusticeMovePending) {
            console.log("Calling executeSwiftJusticeMove...");
            executeSwiftJusticeMove(direction); // Call the special function
            return; // IMPORTANT: Stop processing here for Swift Justice move
        }
        // *** END SWIFT JUSTICE CHECK ***

        // --- If NOT Swift Justice, proceed with NORMAL move/pivot logic ---
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        if (!selectedVamp) {
            addToLog("Select a Vampire first.");
            return;
        }

        // Check if the clicked direction matches the vampire's current facing
        if (direction === selectedVamp.facing) {
            // --- Attempt NORMAL MOVE action ---
            addToLog(`Attempting Move ${direction}...`);
            const targetCoord = getAdjacentCoord(selectedVamp.coord, direction); // Pass direction
            if (targetCoord) {
                // Make sure you pass the vampire object and the target coordinate
                executeMove(selectedVamp, targetCoord);
            } else {
                addToLog("Cannot move forward off the board.");
            }
        } else {
            // --- Attempt NORMAL PIVOT action ---
            addToLog(`Attempting Pivot to ${direction}...`);
            // Make sure you pass the vampire object and the new facing direction
            executePivot(selectedVamp, direction);
        }
    };

    // --- Ensure your listeners call this handler ---
    // (If you don't have a shared handler, add the 'if (isSwiftJusticeMovePending)'
    // block at the start of EACH button's individual listener function)

    btnMoveN?.addEventListener("click", () => handleDirectionButtonClick("N"));
    btnMoveE?.addEventListener("click", () => handleDirectionButtonClick("E"));
    btnMoveS?.addEventListener("click", () => handleDirectionButtonClick("S"));
    btnMoveW?.addEventListener("click", () => handleDirectionButtonClick("W"));

    classButtons.forEach((button) => {
        button.addEventListener("click", () => {
            // This listener enables btnNext
            if (button.disabled) return; // Ignore clicks if button already used by another player
            let currentlySelected = classSelectionContainer.querySelector(".selected");
            if (currentlySelected) {
                currentlySelected.classList.remove("selected"); // Deselect previous
            }
            button.classList.add("selected"); // Highlight clicked button
            const selectedClass = button.dataset.class;
            if (playerData[currentPlayerSetupIndex]) {
                playerData[currentPlayerSetupIndex].class = selectedClass; // Store selection in player data
            }
            displayClassDetails(selectedClass); // Show details for the selected class
            btnNext.disabled = false; // Enable Next button since a class is now chosen
        });
    });

    playerNameInput.addEventListener("input", () => {
        // Update player name in state as user types, use default if empty
        if (playerData[currentPlayerSetupIndex]) {
            playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`;
        }
    });

    // Back Button (Player Setup) Listener - REVISED LOGIC
    btnBack.addEventListener("click", () => {
        console.log("Back button clicked");

        if (currentPlayerSetupIndex > 0) {
            // Determine the new index we are going back TO
            const newPlayerIndex = currentPlayerSetupIndex - 1;

            // --- Revised Logic ---
            // Rebuild the selectedClasses array based ONLY on players BEFORE the one we are going back to.
            // This ensures only confirmed previous selections block buttons.
            selectedClasses = []; // Start fresh
            for (let i = 0; i <= newPlayerIndex; i++) {
                // Loop up to AND INCLUDING the new player index being setup
                // We actually only care about classes selected *before* the current setup player
                if (i < newPlayerIndex && playerData[i]?.class) {
                    selectedClasses.push(playerData[i].class);
                }
                // Also clear the data for players *after* the one we are returning to
                if (i > newPlayerIndex && playerData[i]) {
                    playerData[i] = { name: `P${i + 1}`, class: null };
                }
            }
            // Clear the data for the player we just left (whose choice shouldn't count anymore)
            // This was moved from the old logic, ensure it happens
            if (playerData[currentPlayerSetupIndex]) {
                playerData[currentPlayerSetupIndex] = {
                    name: `P${currentPlayerSetupIndex + 1}`,
                    class: null,
                };
            }

            console.log("Rebuilt selectedClasses for Back:", selectedClasses);
            // --- End Revised Logic ---

            // Go back to previous player's setup screen using the new index
            updatePlayerSetupScreen(newPlayerIndex);
        } else {
            // If already on Player 1, going back goes to player count selection
            playerData = []; // Clear all player data
            selectedClasses = []; // Clear selected classes
            showScreen("playerCount");
        }
    });

    // Next / Start Game Button Listener (Corrected - No Alert)
    btnNext.addEventListener("click", () => {
        console.log("Next/Start Game button clicked");
        const currentPlayerData = playerData[currentPlayerSetupIndex];

        // Button should be disabled if no class selected, but double check state
        if (!currentPlayerData || !currentPlayerData.class) {
            console.error("Next clicked but no class selected!");
            // Optionally provide non-alert feedback, like flashing class buttons
            return; // Prevent proceeding
        }

        // Ensure name is set
        if (!currentPlayerData.name || currentPlayerData.name.trim() === "") {
            currentPlayerData.name = `P${currentPlayerSetupIndex + 1}`;
            playerData[currentPlayerSetupIndex].name = currentPlayerData.name; // Update array
        }

        // Add selected class to the list to disable it for subsequent players
        if (!selectedClasses.includes(currentPlayerData.class)) {
            selectedClasses.push(currentPlayerData.class);
            console.log("Added class to selected list:", currentPlayerData.class, selectedClasses);
        }

        // Proceed
        if (currentPlayerSetupIndex < numberOfPlayers - 1) {
            updatePlayerSetupScreen(currentPlayerSetupIndex + 1);
        } else {
            initializeGame(); // Last player, initialize game state and board
        }
    });

    // Gameplay Screen Global Listeners (Available whenever gameplay screen is active)
    btnToggleLog.addEventListener("click", () => {
        gameLog.classList.toggle("log-hidden");
        // Scroll to bottom when showing log if needed
        if (!gameLog.classList.contains("log-hidden")) {
            gameLog.scrollTop = gameLog.scrollHeight;
        }
    });

    btnBackToSetup.addEventListener("click", () => {
        // Dev button to restart setup
        if (confirm("Return to setup? Game progress will be lost.")) {
            // Reset all state variables
            numberOfPlayers = 0;
            currentPlayerSetupIndex = 0;
            playerData = [];
            selectedClasses = [];
            currentGameState = {};
            gameHistory = [];
            // TODO: Add reset for any other state added later
            console.log("Returning to setup - game state cleared.");
            showScreen("playerCount"); // Show the first screen
        }
    });

    // Action Buttons Listeners (Gameplay Screen)
    btnShoot.addEventListener("click", () => {
        const vamp = findVampireById(currentGameState?.selectedVampireId); // Use optional chaining
        if (vamp) {
            executeShoot(vamp, false); // Execute normal shot
        } else {
            addToLog("Select a Vampire to Shoot.");
        }
    });

    btnSilverBullet.addEventListener("click", () => {
        const vamp = findVampireById(currentGameState?.selectedVampireId);
        if (!currentGameState || !currentGameState.playerResources) return; // Safety check
        const res = currentGameState.playerResources[currentGameState.currentPlayerIndex];
        if (vamp && res.silverBullet > 0) {
            if (confirm("Use your only Silver Bullet?")) {
                // Confirmation
                executeShoot(vamp, true); // Execute silver bullet shot
            }
        } else if (!vamp) {
            addToLog("Select a Vampire to use Silver Bullet.");
        } else {
            addToLog("No Silver Bullet left.");
        }
    });

    btnThrow.addEventListener("click", () => {
        const vamp = findVampireById(currentGameState?.selectedVampireId);
        if (!vamp) {
            addToLog("Select Vampire to Throw.");
            return;
        }
        if (vamp.cursed) {
            addToLog("Cursed vampires cannot throw.");
            return;
        }
        // Check base AP cost (>=1) - specific cost checked in picker handler
        if (!currentGameState || typeof currentGameState.currentAP === "undefined" || currentGameState.currentAP < AP_COST.THROW_HAZARD) {
            addToLog("Not enough AP to initiate Throw.");
            return;
        }
        // Open the hazard picker
        populateHazardPicker(); // Fill picker with current options/counts
        popups.hazardPicker.style.display = "flex"; // Show the popup
        if (currentGameState && currentGameState.actionState) currentGameState.actionState.pendingAction = "throw-select-hazard";
        addToLog("Select hazard type to throw.");
    });

    btnCancelThrow.addEventListener("click", () => {
        // Logic for cancelling the throw action from the picker
        popups.hazardPicker.style.display = "none"; // Hide the popup
        if (currentGameState && currentGameState.actionState) {
            currentGameState.actionState = {
                pendingAction: null,
                selectedHazardType: null,
            };
        }
        clearHighlights(); // Remove any target highlights
        addToLog("Throw action cancelled.");
    });

    hazardPickerOptions.addEventListener("click", (event) => {
        // Handle clicks within the hazard picker using event delegation
        const button = event.target.closest("button");
        if (button && button.dataset.hazardType) {
            handleHazardSelection(button.dataset.hazardType); // Process selected hazard
        }
    });

    // Note: Listeners for gameBoard, btnUndo, btnEndTurn are attached inside initializeGame function

    // --- 6. Initial Call --- // Note: Original numbering kept, this is Section 5 of pasting
    showScreen("playerCount"); // Start the application by showing the player count selection screen
}); // End DOMContentLoaded <-- Add the line ABOVE this closing brace and parenthesis

// ==========================================
// CONSTANTS - Shared configuration values
// ==========================================

// Salary caps
const SALARY_CAP = 50000;
const CLASSIC_SALARY_CAP = 50000;

// Showdown slate time mapping (6 slates)
const slateTimeMap = {
    '12:00': 1, '12:30': 1,
    '1:00': 1, '1:30': 1,
    '2:00': 2, '2:30': 2,
    '3:00': 2, '3:30': 2,
    '4:00': 3, '4:30': 3,
    '5:00': 3, '5:30': 3,
    '6:00': 4, '6:30': 4,
    '7:00': 4, '7:30': 4,
    '8:00': 5, '8:30': 5,
    '9:00': 5, '9:30': 5,
    '10:00': 6, '10:30': 6,
    '11:00': 6, '11:30': 6
};

// Classic slate time mapping (2 slates)
const classicSlateTimeMap = {
    '12:00': 1, '12:30': 1,
    '14:00': 1, '14:30': 1, '2:00': 1,
    '16:00': 1, '16:30': 1, '4:00': 1,
    '18:00': 2, '18:30': 2, '6:00': 2,
    '20:00': 2, '20:30': 2, '8:00': 2, '20:15': 2, '20:20': 2,
    '22:00': 2, '22:30': 2, '10:00': 2
};

// NFL Teams Database with colors and logos
const NFL_TEAMS = {
    'ARI': { name: 'Cardinals', city: 'Arizona', primary: '#97233F', secondary: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png' },
    'ATL': { name: 'Falcons', city: 'Atlanta', primary: '#A71930', secondary: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png' },
    'BAL': { name: 'Ravens', city: 'Baltimore', primary: '#241773', secondary: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' },
    'BUF': { name: 'Bills', city: 'Buffalo', primary: '#00338D', secondary: '#C60C30', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png' },
    'CAR': { name: 'Panthers', city: 'Carolina', primary: '#0085CA', secondary: '#101820', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png' },
    'CHI': { name: 'Bears', city: 'Chicago', primary: '#0B162A', secondary: '#C83803', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png' },
    'CIN': { name: 'Bengals', city: 'Cincinnati', primary: '#FB4F14', secondary: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png' },
    'CLE': { name: 'Browns', city: 'Cleveland', primary: '#311D00', secondary: '#FF3C00', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png' },
    'DAL': { name: 'Cowboys', city: 'Dallas', primary: '#003594', secondary: '#869397', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
    'DEN': { name: 'Broncos', city: 'Denver', primary: '#FB4F14', secondary: '#002244', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png' },
    'DET': { name: 'Lions', city: 'Detroit', primary: '#0076B6', secondary: '#B0B7BC', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png' },
    'GB': { name: 'Packers', city: 'Green Bay', primary: '#203731', secondary: '#FFB612', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png' },
    'HOU': { name: 'Texans', city: 'Houston', primary: '#03202F', secondary: '#A71930', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png' },
    'IND': { name: 'Colts', city: 'Indianapolis', primary: '#002C5F', secondary: '#A2AAAD', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png' },
    'JAX': { name: 'Jaguars', city: 'Jacksonville', primary: '#006778', secondary: '#D7A22A', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png' },
    'KC': { name: 'Chiefs', city: 'Kansas City', primary: '#E31837', secondary: '#FFB81C', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png' },
    'LV': { name: 'Raiders', city: 'Las Vegas', primary: '#000000', secondary: '#A5ACAF', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png' },
    'LAC': { name: 'Chargers', city: 'Los Angeles', primary: '#0080C6', secondary: '#FFC20E', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png' },
    'LAR': { name: 'Rams', city: 'Los Angeles', primary: '#003594', secondary: '#FFA300', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png' },
    'MIA': { name: 'Dolphins', city: 'Miami', primary: '#008E97', secondary: '#FC4C02', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png' },
    'MIN': { name: 'Vikings', city: 'Minnesota', primary: '#4F2683', secondary: '#FFC62F', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png' },
    'NE': { name: 'Patriots', city: 'New England', primary: '#002244', secondary: '#C60C30', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png' },
    'NO': { name: 'Saints', city: 'New Orleans', primary: '#D3BC8D', secondary: '#101820', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png' },
    'NYG': { name: 'Giants', city: 'New York', primary: '#0B2265', secondary: '#A71930', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png' },
    'NYJ': { name: 'Jets', city: 'New York', primary: '#125740', secondary: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png' },
    'PHI': { name: 'Eagles', city: 'Philadelphia', primary: '#004C54', secondary: '#A5ACAF', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png' },
    'PIT': { name: 'Steelers', city: 'Pittsburgh', primary: '#FFB612', secondary: '#101820', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png' },
    'SF': { name: '49ers', city: 'San Francisco', primary: '#AA0000', secondary: '#B3995D', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' },
    'SEA': { name: 'Seahawks', city: 'Seattle', primary: '#002244', secondary: '#69BE28', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png' },
    'TB': { name: 'Buccaneers', city: 'Tampa Bay', primary: '#D50A0A', secondary: '#FF7900', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png' },
    'TEN': { name: 'Titans', city: 'Tennessee', primary: '#0C2340', secondary: '#4B92DB', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png' },
    'WAS': { name: 'Commanders', city: 'Washington', primary: '#5A1414', secondary: '#FFB612', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/was.png' }
};

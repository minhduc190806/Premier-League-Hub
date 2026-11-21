/**
 * PREMIER LEAGUE HUB VIỆT NAM - REAL-TIME APPLICATION ENGINE
 * Tự động cập nhật dữ liệu mới nhất từ Premier League mỗi khi mở trang web
 */

// Hàm phòng vệ XSS: Mã hóa an toàn các chuỗi ký tự động trước khi chèn vào HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Bổ sung thông tin quản lý & sân vận động cho 20 CLB
const CLUB_META = {
  1: { stadium: "Emirates Stadium (60,704 chỗ)", manager: "Mikel Arteta", founded: 1886 },
  2: { stadium: "Villa Park (42,682 chỗ)", manager: "Unai Emery", founded: 1874 },
  3: { stadium: "Vitality Stadium (11,307 chỗ)", manager: "Andoni Iraola", founded: 1899 },
  4: { stadium: "Gtech Community Stadium (17,250 chỗ)", manager: "Thomas Frank", founded: 1889 },
  5: { stadium: "Amex Stadium (31,876 chỗ)", manager: "Fabian Hürzeler", founded: 1901 },
  6: { stadium: "Stamford Bridge (40,341 chỗ)", manager: "Enzo Maresca", founded: 1905 },
  7: { stadium: "Coventry Building Society Arena (32,609 chỗ)", manager: "Mark Robins", founded: 1883 },
  8: { stadium: "Selhurst Park (25,486 chỗ)", manager: "Oliver Glasner", founded: 1905 },
  9: { stadium: "Goodison Park (39,572 chỗ)", manager: "Sean Dyche", founded: 1878 },
  10: { stadium: "Craven Cottage (22,384 chỗ)", manager: "Marco Silva", founded: 1879 },
  11: { stadium: "MKM Stadium (25,586 chỗ)", manager: "Tim Walter", founded: 1904 },
  12: { stadium: "Portman Road (29,673 chỗ)", manager: "Kieran McKenna", founded: 1878 },
  13: { stadium: "Elland Road (37,890 chỗ)", manager: "Daniel Farke", founded: 1919 },
  14: { stadium: "Anfield (61,276 chỗ)", manager: "Arne Slot", founded: 1892 },
  15: { stadium: "Etihad Stadium (53,400 chỗ)", manager: "Pep Guardiola", founded: 1880 },
  16: { stadium: "Old Trafford (74,310 chỗ)", manager: "Rúben Amorim", founded: 1878 },
  17: { stadium: "St. James' Park (52,305 chỗ)", manager: "Eddie Howe", founded: 1892 },
  18: { stadium: "The City Ground (30,445 chỗ)", manager: "Nuno Espírito Santo", founded: 1865 },
  19: { stadium: "Tottenham Hotspur Stadium (62,850 chỗ)", manager: "Ange Postecoglou", founded: 1882 },
  20: { stadium: "Stadium of Light (49,000 chỗ)", manager: "Régis Le Bris", founded: 1879 }
};

const app = {
  currentGameweek: 11,
  currentStatFilter: 'goals',
  selectedClubId: null,
  favoriteTeamId: localStorage.getItem('epl_favorite_team') || null,
  isSyncing: false,

  init() {
    // 1. Xoa sach cache cac ban cu de nap chuan du lieu Vong 11
    localStorage.removeItem('epl_live_cache');
    localStorage.removeItem('epl_live_cache_v2');

    const cachedData = localStorage.getItem('epl_live_cache_v3');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && parsed.teams && parsed.players) {
          window.EPL_DATA = parsed;
        }
      } catch (e) {
        localStorage.removeItem('epl_live_cache_v3');
      }
    }

    if (window.EPL_DATA && window.EPL_DATA.currentGameweek) {
      this.currentGameweek = window.EPL_DATA.currentGameweek;
    }

    this.renderLastUpdated();
    this.populateFavoriteDropdown();
    this.renderStandings();
    this.renderFixtures();
    this.renderStats('goals');
    this.renderClubsGrid();
    this.renderInjuries();

    // Lang nghe su kien ban phim
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    if (this.favoriteTeamId) {
      this.highlightFavoriteTeam(Number(this.favoriteTeamId));
    }

    // 2. Tu dong ket noi API Premier League moi khi vao web
    this.syncLiveFPLData(false);

    // 3. Tu dong kiem tra lam moi moi 3 phut khi dang mo tab
    setInterval(() => {
      this.syncLiveFPLData(false);
    }, 180000);
  },

  // TU DONG KET NOI API PREMIER LEAGUE TRUC TIEP
  async syncLiveFPLData(isManual = false) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    const badge = document.getElementById('heroBadge');
    const updateTxt = document.getElementById('lastUpdatedText');
    const btnRefresh = document.querySelector('.btn-refresh');

    if (badge) {
      badge.innerHTML = '\uD83D\uDD04 \u0110ang \u0111\u1ED3ng b\u1ED9 d\u1EEF li\u1EC7u th\u1EDDi gian th\u1EF1c...';
      badge.style.background = 'rgba(255, 184, 0, 0.2)';
      badge.style.color = '#ffb800';
    }
    if (btnRefresh) {
      btnRefresh.innerHTML = '<span>\u23F3</span> \u0110ang t\u1EA3i...';
    }

    let success = false;

    // Danh sach nguon du lieu theo thu tu uu tien
    const sources = [];

    // Kenh 1: Vercel Serverless API & Rewrites (Khi chay tren web Vercel)
    if (window.location.protocol.startsWith('http')) {
      sources.push({
        name: 'Vercel Serverless API',
        bootstrapUrl: '/api/bootstrap',
        fixturesUrl: '/api/fixtures'
      });
      sources.push({
        name: 'Vercel Rewrite',
        bootstrapUrl: '/api/fpl-bootstrap',
        fixturesUrl: '/api/fpl-fixtures'
      });
    }

    // Kenh 2: Public CORS proxies (khi mo file:// tren may)
    const proxyList = [
      url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    for (const p of proxyList) {
      sources.push({
        name: 'Public Proxy',
        bootstrapUrl: p('https://fantasy.premierleague.com/api/bootstrap-static/'),
        fixturesUrl: p('https://fantasy.premierleague.com/api/fixtures/')
      });
    }

    try {
      for (const src of sources) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout chong treo

          const [resBootstrap, resFixtures] = await Promise.all([
            fetch(src.bootstrapUrl, { cache: 'no-cache', signal: controller.signal }),
            fetch(src.fixturesUrl, { cache: 'no-cache', signal: controller.signal })
          ]);
          clearTimeout(timeoutId);

          if (!resBootstrap.ok || !resFixtures.ok) continue;

          const bootstrap = await resBootstrap.json();
          const fixtures = await resFixtures.json();

          if (bootstrap && bootstrap.teams && bootstrap.elements && Array.isArray(fixtures)) {
            this.processAndApplyLiveData(bootstrap, fixtures);
            success = true;
            break;
          }
        } catch (err) {
          console.warn(`Kenh ${src.name} khong kha dung, chuyen tiep:`, err.message);
        }
      }
    } catch (err) {
      console.error('Loi khi dong bo FPL:', err);
    } finally {
      this.isSyncing = false;
    }

    if (success) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ng\u00E0y ' + now.toLocaleDateString('vi-VN');
      EPL_DATA.lastUpdated = timeStr;

      localStorage.setItem('epl_live_cache_v3', JSON.stringify(EPL_DATA));

      if (badge) {
        badge.innerHTML = '\uD83D\uDFE2 Tr\u1EF1c Ti\u1EBFp (Live Real-Time)';
        badge.style.background = 'rgba(0, 255, 135, 0.2)';
        badge.style.color = 'var(--epl-green)';
      }
      if (updateTxt) {
        updateTxt.innerHTML = "\u26A1 <strong>D\u1EEF li\u1EC7u v\u1EEBa \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt tr\u1EF1c ti\u1EBFp l\u00FAc " + timeStr + "</strong> | Ngu\u1ED3n FPL ch\u00EDnh th\u1EE9c.";
      }
      if (btnRefresh) {
        btnRefresh.innerHTML = '<span>\u2705</span> M\u1EDBi Nh\u1EA5t';
        setTimeout(() => { btnRefresh.innerHTML = '<span>\uD83D\uDD04</span> L\u00E0m M\u1EDBi'; }, 2000);
      }

      this.renderStandings();
      this.renderFixtures();
      this.renderStats(this.currentStatFilter);
      this.renderClubsGrid();
      this.renderInjuries();

      if (isManual) {
        this.showToast('\u2705 \u0110\u00E3 c\u1EADp nh\u1EADt th\u00E0nh c\u00F4ng d\u1EEF li\u1EC7u m\u1EDBi nh\u1EA5t t\u1EEB Ngo\u1EA1i H\u1EA1ng Anh!');
      }
    } else {
      if (badge) {
        badge.innerHTML = "\uD83D\uDFE2 D\u1EEF li\u1EC7u Premier League M\u1EDBi Nh\u1EA5t (" + (EPL_DATA.lastUpdated || "V\u00F2ng 11") + ")";
        badge.style.background = 'rgba(0, 255, 135, 0.15)';
        badge.style.color = 'var(--epl-green)';
      }
      if (updateTxt && EPL_DATA.lastUpdated) {
        updateTxt.innerHTML = "\uD83D\uDFE2 <strong>D\u1EEF li\u1EC7u Premier League M\u1EDBi Nh\u1EA5t</strong> (" + EPL_DATA.lastUpdated + ")";
      }
      if (btnRefresh) {
        btnRefresh.innerHTML = '<span>\uD83D\uDD04</span> L\u00E0m M\u1EDBi';
      }
      if (isManual) {
        this.showToast('\uD83D\uDCC1 \u0110\u00E3 l\u00E0m m\u1EDBi d\u1EEF li\u1EC7u Premier League m\u1EDBi nh\u1EA5t.');
      }
    }
  },

  // Xu ly du lieu tho tu FPL thanh cau truc hoan chinh
  processAndApplyLiveData(bootstrap, fixtures) {
    // 1. Tinh toan BXH tu Fixtures (Bao gom ca tran da ket thuc va tran DANG DA)
    const teamsTable = {};
    bootstrap.teams.forEach(t => {
      teamsTable[t.id] = {
        id: t.id,
        name: t.name,
        shortName: t.short_name,
        code: t.code,
        logo: `https://resources.premierleague.com/premierleague/badges/70/t${t.code}.png`,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
        form: []
      };
    });

    fixtures.forEach(f => {
      const isFinished = f.finished || f.finished_provisional;
      const isLive = f.started && !isFinished;
      // Cap nhat ca tran da ket thuc lan tran dang da co ty so
      if ((isFinished || isLive) && f.team_h_score !== null && f.team_a_score !== null) {
        const h = teamsTable[f.team_h];
        const a = teamsTable[f.team_a];
        if (h && a) {
          h.played++; a.played++;
          h.gf += f.team_h_score; h.ga += f.team_a_score;
          a.gf += f.team_a_score; a.ga += f.team_h_score;

          if (f.team_h_score > f.team_a_score) {
            h.won++; h.points += 3; h.form.push('W');
            a.lost++; a.form.push('L');
          } else if (f.team_h_score < f.team_a_score) {
            a.won++; a.points += 3; a.form.push('W');
            h.lost++; h.form.push('L');
          } else {
            h.drawn++; h.points += 1; h.form.push('D');
            a.drawn++; a.points += 1; a.form.push('D');
          }
        }
      }
    });

    const teamList = Object.values(teamsTable).map(item => {
      item.gd = item.gf - item.ga;
      if (item.form.length > 5) {
        item.form = item.form.slice(item.form.length - 5);
      }
      return item;
    });

    // 2. Chuyen doi danh sach cau thu
    const posMap = { 1: 'GK', 2: 'DF', 3: 'MF', 4: 'FW' };
    const playerList = [];

    bootstrap.elements.forEach(p => {
      if (p.status === 'u') return;

      let st = 'ready';
      if (p.status === 'i') st = 'injured';
      else if (p.status === 'd') st = 'doubtful';
      else if (p.status === 's') st = 'suspended';

      playerList.push({
        id: p.id,
        teamId: p.team,
        name: `${p.first_name} ${p.second_name}`.trim(),
        webName: p.web_name,
        number: p.squad_number || 0,
        pos: posMap[p.element_type] || 'MF',
        goals: p.goals_scored || 0,
        assists: p.assists || 0,
        cleanSheets: p.clean_sheets || 0,
        yellow: p.yellow_cards || 0,
        red: p.red_cards || 0,
        fplPoints: p.total_points || 0,
        cost: p.now_cost ? (p.now_cost / 10).toFixed(1) + 'M Â£' : 'FPL',
        status: st,
        injuryReason: p.news || '',
        chanceOfPlaying: p.chance_of_playing_next_round
      });
    });

    // 3. Chuyen doi Lich thi dau sang Gio Viet Nam (GMT+7)
    const fixtureList = fixtures.map(f => {
      let dateVN = "TBD";
      let timeVN = "TBD";
      if (f.kickoff_time) {
        try {
          const d = new Date(f.kickoff_time);
          dateVN = d.toLocaleDateString('vi-VN');
          timeVN = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {}
      }

      let st = 'UPCOMING';
      if (f.finished || f.finished_provisional) st = 'FT';
      else if (f.started) st = 'LIVE';

      return {
        id: f.id,
        gameweek: f.event,
        homeTeamId: f.team_h,
        awayTeamId: f.team_a,
        homeScore: f.team_h_score,
        awayScore: f.team_a_score,
        date: dateVN,
        time: timeVN,
        status: st
      };
    });

    // Xac dinh Gameweek hien tai
    const currentEvent = bootstrap.events.find(e => e.is_current) || bootstrap.events.find(e => e.is_next);
    if (currentEvent) {
      this.currentGameweek = currentEvent.id;
    }

    EPL_DATA.teams = teamList;
    EPL_DATA.players = playerList;
    EPL_DATA.fixtures = fixtureList;
    EPL_DATA.currentGameweek = this.currentGameweek;
  },

  // Hien thi thong bao Toast nhanh
  showToast(msg) {
    let toast = document.getElementById('eplToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'eplToast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        background: #00ff87; color: #12021c; font-weight: 800;
        padding: 12px 20px; border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        z-index: 999; font-size: 0.88rem;
        transition: transform 0.3s, opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
    }, 3000);
  },

  // 1. Chuyển Tab
  switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const target = document.getElementById(`view-${tabName}`);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  renderLastUpdated() {
    const el = document.getElementById('lastUpdatedText');
    if (el) el.innerHTML = `🟢 <strong>Dữ liệu Premier League Mới Nhất</strong> (${EPL_DATA.lastUpdated})`;
  },

  // 2. Render Bảng Xếp Hạng
  renderStandings() {
    const tbody = document.getElementById('standingsTableBody');
    if (!tbody || !EPL_DATA.teams) return;

    const sortedTeams = [...EPL_DATA.teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });

    tbody.innerHTML = sortedTeams.map((team, idx) => {
      const rank = idx + 1;
      let rankClass = '';
      if (rank <= 5) rankClass = 'rank-ucl';
      else if (rank === 6) rankClass = 'rank-uel';
      else if (rank >= 18) rankClass = 'rank-rel';

      const isFavorite = Number(this.favoriteTeamId) === team.id;

      const formHtml = (team.form || []).map(f => {
        let dotClass = 'dot-w';
        let label = 'T';
        if (f === 'D') { dotClass = 'dot-d'; label = 'H'; }
        if (f === 'L') { dotClass = 'dot-l'; label = 'B'; }
        return `<span class="form-dot ${dotClass}" title="${label === 'T' ? 'Thắng' : label === 'H' ? 'Hòa' : 'Bại'}">${label}</span>`;
      }).join('');

      return `
        <tr onclick="app.viewClubDetail(${team.id})" style="${isFavorite ? 'background: rgba(0, 255, 135, 0.08);' : ''}">
          <td><span class="rank-badge ${rankClass}">${rank}</span></td>
          <td>
            <div class="team-cell">
              <img src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.name)}" class="team-logo-small">
              <span>${escapeHtml(team.name)} ${isFavorite ? '⭐' : ''}</span>
            </div>
          </td>
          <td>${team.played}</td>
          <td>${team.won}</td>
          <td>${team.drawn}</td>
          <td>${team.lost}</td>
          <td>${team.gf}</td>
          <td>${team.ga}</td>
          <td>${team.gd > 0 ? '+' + team.gd : team.gd}</td>
          <td class="points-cell">${team.points}</td>
          <td><div class="form-dots">${formHtml}</div></td>
        </tr>
      `;
    }).join('');
  },

  // 3. Render Lịch Thi Đấu & Kết Quả
  changeGameweek(delta) {
    const newGw = this.currentGameweek + delta;
    if (newGw >= 1 && newGw <= 38) {
      this.currentGameweek = newGw;
      this.renderFixtures();
    }
  },

  renderFixtures() {
    const container = document.getElementById('fixturesGrid');
    const title = document.getElementById('currentGwDisplay');
    if (!container || !title || !EPL_DATA.fixtures) return;

    title.textContent = `Vòng ${this.currentGameweek}`;

    const matches = EPL_DATA.fixtures.filter(f => f.gameweek === this.currentGameweek);

    if (matches.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          Chưa có dữ liệu lịch thi đấu cho Vòng ${this.currentGameweek}.
        </div>
      `;
      return;
    }

    container.innerHTML = matches.map(m => {
      const home = EPL_DATA.teams.find(t => t.id === m.homeTeamId) || { name: 'Đội nhà', logo: '' };
      const away = EPL_DATA.teams.find(t => t.id === m.awayTeamId) || { name: 'Đội khách', logo: '' };

      const isFT = m.status === 'FT';
      const isLive = m.status === 'LIVE';

      let statusPill = `<span class="match-status-badge status-upcoming">SẮP ĐÁ</span>`;
      if (isFT) {
        statusPill = `<span class="match-status-badge status-ft">KẾT THÚC</span>`;
      } else if (isLive) {
        statusPill = `<span class="match-status-badge" style="background: #e90052; color: #fff; animation: pulse 1s infinite;">● ĐANG ĐÁ</span>`;
      }

      const scoreDisplay = isFT || isLive
        ? `${m.homeScore} - ${m.awayScore}`
        : `${m.time}`;

      const meta = CLUB_META[home.id] || {};

      return `
        <div class="match-card">
          <div class="match-header">
            <span>📅 ${m.date} - ${m.time} (Giờ VN)</span>
            ${statusPill}
          </div>
          <div class="match-teams">
            <div class="match-team home">
              <img src="${escapeHtml(home.logo)}" alt="${escapeHtml(home.name)}" style="width: 28px; height: 28px; object-fit: contain;">
              <span class="match-team-name">${escapeHtml(home.name)}</span>
            </div>

            <div class="match-score-box">${scoreDisplay}</div>

            <div class="match-team away">
              <span class="match-team-name">${escapeHtml(away.name)}</span>
              <img src="${escapeHtml(away.logo)}" alt="${escapeHtml(away.name)}" style="width: 28px; height: 28px; object-fit: contain;">
            </div>
          </div>
          <div class="match-footer">
            🏟️ ${escapeHtml(meta.stadium || 'Sân Vận Động Premier League')}
          </div>
        </div>
      `;
    }).join('');
  },

  // 4. Render Thống Kê Cầu Thủ
  filterStats(type) {
    this.currentStatFilter = type;
    document.querySelectorAll('.btn-stat-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stat === type);
    });
    this.renderStats(type);
  },

  renderStats(type) {
    const thead = document.getElementById('statsTableHead');
    const tbody = document.getElementById('statsTableBody');
    const note = document.getElementById('statsNote');
    if (!thead || !tbody || !EPL_DATA.players) return;

    let filteredPlayers = [];
    let statColumnName = "";
    let statKey = "";

    if (type === 'goals') {
      statColumnName = "Bàn Thắng";
      statKey = "goals";
      note.textContent = "* Top chân sút ghi bàn nhiều nhất mùa giải hiện tại.";
      filteredPlayers = EPL_DATA.players
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals);

    } else if (type === 'assists') {
      statColumnName = "Kiến Tạo";
      statKey = "assists";
      note.textContent = "* Top chân chuyền kiến tạo nhiều nhất giải đấu.";
      filteredPlayers = EPL_DATA.players
        .filter(p => p.assists > 0)
        .sort((a, b) => b.assists - a.assists);

    } else if (type === 'cleansheets') {
      // === YÊU CẦU: CHỈ HIỂN THỊ THỦ MÔN (GK) VÀ CHỈ LẤY SỐ TRẬN >= 1 (ẨN 0 TRẬN) ===
      statColumnName = "Số Trận Giữ Sạch Lưới";
      statKey = "cleanSheets";
      note.textContent = "🧤 Chế độ Găng tay vàng: Chỉ hiển thị Thủ môn (GK) có từ 1 trận giữ sạch lưới trở lên.";
      filteredPlayers = EPL_DATA.players
        .filter(p => p.pos === 'GK' && p.cleanSheets >= 1)
        .sort((a, b) => b.cleanSheets - a.cleanSheets);

      // Bảng 4 cột chuẩn
      thead.innerHTML = `
        <tr>
          <th style="width: 70px;">Hạng</th>
          <th style="text-align: left;">Thủ Môn</th>
          <th style="text-align: left;">Câu Lạc Bộ</th>
          <th style="color: var(--epl-green); font-weight: 800;">Số Trận Giữ Sạch Lưới</th>
        </tr>
      `;

      if (filteredPlayers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 30px; color: var(--text-muted);">Chưa có dữ liệu thủ môn giữ sạch lưới.</td></tr>`;
        return;
      }

      tbody.innerHTML = filteredPlayers.map((player, idx) => {
        const team = EPL_DATA.teams.find(t => t.id === player.teamId) || { name: 'CLB', logo: '' };
        return `
          <tr onclick="app.openModal(${player.id})">
            <td><strong style="color: var(--epl-green);">${idx + 1}</strong></td>
            <td style="text-align: left; font-weight: 700;">
              🧤 ${escapeHtml(player.webName || player.name)} <span style="font-size: 0.75rem; color: var(--text-muted);">(#${escapeHtml(player.number)})</span>
            </td>
            <td style="text-align: left;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.name)}" style="width: 20px; height: 20px; object-fit: contain;">
                <span>${escapeHtml(team.name)}</span>
              </div>
            </td>
            <td style="font-size: 1.15rem; font-weight: 900; color: var(--epl-green);">${player.cleanSheets}</td>
          </tr>
        `;
      }).join('');
      return;

    } else if (type === 'yellow') {
      statColumnName = "Thẻ Vàng";
      statKey = "yellow";
      note.textContent = "* Thống kê cầu thủ nhận nhiều thẻ vàng nhất.";
      filteredPlayers = EPL_DATA.players
        .filter(p => p.yellow > 0)
        .sort((a, b) => b.yellow - a.yellow);

    } else if (type === 'red') {
      statColumnName = "Thẻ Đỏ";
      statKey = "red";
      note.textContent = "* Thống kê cầu thủ nhận thẻ đỏ trực tiếp hoặc gián tiếp.";
      filteredPlayers = EPL_DATA.players
        .filter(p => p.red > 0)
        .sort((a, b) => b.red - a.red);
    }

    // Header 5 cột chuẩn
    thead.innerHTML = `
      <tr>
        <th style="width: 70px;">Hạng</th>
        <th style="text-align: left;">Cầu Thủ</th>
        <th style="text-align: left;">Câu Lạc Bộ</th>
        <th>Vị Trí</th>
        <th style="color: var(--epl-green); font-weight: 800;">${statColumnName}</th>
      </tr>
    `;

    if (filteredPlayers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding: 30px; color: var(--text-muted);">Không có dữ liệu phù hợp.</td></tr>`;
      return;
    }

    tbody.innerHTML = filteredPlayers.map((player, idx) => {
      const team = EPL_DATA.teams.find(t => t.id === player.teamId) || { name: 'CLB', logo: '' };
      const posLabel = { 'GK': 'Thủ môn', 'DF': 'Hậu vệ', 'MF': 'Tiền vệ', 'FW': 'Tiền đạo' }[player.pos] || player.pos;

      return `
        <tr onclick="app.openModal(${player.id})">
          <td><strong style="color: var(--epl-green);">${idx + 1}</strong></td>
          <td style="text-align: left; font-weight: 700;">
            ${escapeHtml(player.webName || player.name)} <span style="font-size: 0.75rem; color: var(--text-muted);">(#${escapeHtml(player.number)})</span>
          </td>
          <td style="text-align: left;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.name)}" style="width: 20px; height: 20px; object-fit: contain;">
              <span>${escapeHtml(team.name)}</span>
            </div>
          </td>
          <td><span style="font-size: 0.75rem; padding: 2px 6px; background: rgba(255,255,255,0.08); border-radius: 4px;">${posLabel}</span></td>
          <td style="font-size: 1.15rem; font-weight: 900; color: var(--epl-green);">${player[statKey]}</td>
        </tr>
      `;
    }).join('');
  },

  // 5. Render 20 CLB
  renderClubsGrid() {
    const container = document.getElementById('clubsGrid');
    if (!container || !EPL_DATA.teams) return;

    container.innerHTML = EPL_DATA.teams.map(team => {
      const meta = CLUB_META[team.id] || { stadium: "Premier League Stadium", manager: "Ban Huấn Luyện" };
      return `
        <div class="club-card" onclick="app.viewClubDetail(${team.id})">
          <img src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.name)}" class="club-card-logo">
          <div class="club-card-name">${escapeHtml(team.name)}</div>
          <div class="club-card-stadium">🏟️ ${escapeHtml(meta.stadium)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">HLV: ${escapeHtml(meta.manager)}</div>
          <div class="club-card-btn">Xem Đội Hình →</div>
        </div>
      `;
    }).join('');
  },

  viewClubDetail(clubId) {
    this.selectedClubId = clubId;
    const team = EPL_DATA.teams.find(t => t.id === clubId);
    if (!team) return;

    this.switchTab('clubs');

    document.getElementById('clubsListView').style.display = 'none';
    const detailView = document.getElementById('clubDetailView');
    detailView.style.display = 'block';

    const meta = CLUB_META[team.id] || { stadium: "Premier League Stadium", manager: "Ban Huấn Luyện", founded: "1900" };

    const hero = document.getElementById('clubHeroBanner');
    hero.innerHTML = `
      <img src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.name)}" class="club-hero-logo">
      <div style="flex: 1;">
        <h2 style="font-size: 1.6rem; font-weight: 800;">${escapeHtml(team.name)}</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">
          Năm thành lập: <strong>${escapeHtml(meta.founded)}</strong> | SVĐ: <strong>${escapeHtml(meta.stadium)}</strong>
        </p>
        <p style="color: var(--epl-green); font-size: 0.85rem; font-weight: 700; margin-top: 2px;">
          Huấn luyện viên trưởng: ${escapeHtml(meta.manager)}
        </p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 0.8rem; color: var(--text-muted);">Thành tích mùa này</div>
        <div style="font-size: 1.5rem; font-weight: 900; color: var(--epl-green);">Hạng #${this.getTeamRank(team.id)} (${team.points} điểm)</div>
      </div>
    `;

    // Lọc danh sách cầu thủ của CLB này
    const squad = (EPL_DATA.players || []).filter(p => p.teamId === clubId);

    // TÁCH THÀNH 4 NHÓM VỊ TRÍ RÕ RỆT
    const gkList = squad.filter(p => p.pos === 'GK').sort((a,b) => (a.number || 99) - (b.number || 99));
    const dfList = squad.filter(p => p.pos === 'DF').sort((a,b) => (a.number || 99) - (b.number || 99));
    const mfList = squad.filter(p => p.pos === 'MF').sort((a,b) => (a.number || 99) - (b.number || 99));
    const fwList = squad.filter(p => p.pos === 'FW').sort((a,b) => (a.number || 99) - (b.number || 99));

    const squadContainer = document.getElementById('clubSquadContainer');
    squadContainer.innerHTML = `
      ${this.renderSquadGroup('🧤 THỦ MÔN', gkList)}
      ${this.renderSquadGroup('🛡️ HẬU VỆ', dfList)}
      ${this.renderSquadGroup('⚙️ TIỀN VỆ', mfList)}
      ${this.renderSquadGroup('⚡ TIỀN ĐẠO', fwList)}
    `;

    window.scrollTo({ top: 120, behavior: 'smooth' });
  },

  renderSquadGroup(title, list) {
    if (list.length === 0) return '';

    const cardsHtml = list.map(p => {
      let statusDot = 'status-ready';
      let statusTitle = 'Sẵn sàng ra sân';
      if (p.status === 'injured') { statusDot = 'status-injured'; statusTitle = `Chấn thương: ${p.injuryReason || ''}`; }
      else if (p.status === 'doubtful') { statusDot = 'status-doubtful'; statusTitle = `Nghi ngờ khả năng ra sân: ${p.injuryReason || ''}`; }
      else if (p.status === 'suspended') { statusDot = 'status-suspended'; statusTitle = `Treo giò: ${p.injuryReason || ''}`; }

      return `
        <div class="player-card" onclick="app.openModal(${p.id})">
          <div class="player-num-badge">${escapeHtml(p.number || '•')}</div>
          <div class="player-info-meta">
            <div class="player-info-name">
              ${escapeHtml(p.webName || p.name)}
              <span class="status-indicator ${statusDot}" title="${escapeHtml(statusTitle)}"></span>
            </div>
            <div class="player-info-pos">${escapeHtml(p.name)} | ${escapeHtml(p.pos)}</div>
          </div>
          <div style="text-align: right; font-size: 0.8rem; font-weight: 700; color: var(--epl-green);">
            ${p.goals > 0 ? p.goals + ' ⚽' : ''}
            ${p.assists > 0 ? p.assists + ' 🎯' : ''}
            ${p.pos === 'GK' && p.cleanSheets > 0 ? p.cleanSheets + ' 🧤' : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div>
        <h3 class="squad-group-title">${title} (${list.length} cầu thủ)</h3>
        <div class="players-grid">${cardsHtml}</div>
      </div>
    `;
  },

  backToClubsList() {
    document.getElementById('clubDetailView').style.display = 'none';
    document.getElementById('clubsListView').style.display = 'block';
  },

  getTeamRank(teamId) {
    const sorted = [...(EPL_DATA.teams || [])].sort((a,b) => b.points - a.points);
    return sorted.findIndex(t => t.id === teamId) + 1;
  },

  // Dịch thuật ngữ chấn thương sang Tiếng Việt
  translateInjury(text) {
    if (!text) return 'Chấn thương / Chưa rõ';
    let t = text;
    t = t.replace(/Thigh injury/gi, 'Chấn thương cơ đùi');
    t = t.replace(/Hamstring injury/gi, 'Chấn thương gân kheo');
    t = t.replace(/Knee injury/gi, 'Chấn thương đầu gối');
    t = t.replace(/Ankle injury/gi, 'Chấn thương mắt cá');
    t = t.replace(/Calf injury/gi, 'Chấn thương bắp chân');
    t = t.replace(/Groin injury/gi, 'Chấn thương cơ háng');
    t = t.replace(/Muscle injury/gi, 'Chấn thương cơ bắp');
    t = t.replace(/Head injury/gi, 'Chấn thương đầu');
    t = t.replace(/Back injury/gi, 'Chấn thương lưng');
    t = t.replace(/Foot injury/gi, 'Chấn thương bàn chân');
    t = t.replace(/Shoulder injury/gi, 'Chấn thương vai');
    t = t.replace(/Hip injury/gi, 'Chấn thương hông');
    t = t.replace(/Lack of match fitness/gi, 'Chưa đủ thể lực thi đấu');
    t = t.replace(/Knock/gi, 'Va chạm nhẹ');
    t = t.replace(/Illness/gi, 'Bị ốm');
    t = t.replace(/Suspended/gi, 'Bị treo giò');
    t = t.replace(/Unknown return date/gi, 'Chưa xác định ngày trở lại');
    t = t.replace(/Expected return/gi, 'Dự kiến trở lại:');
    t = t.replace(/chance of playing/gi, 'khả năng ra sân');
    return t;
  },

  // 6. Render Chấn Thương & Treo Giò
  renderInjuries() {
    const container = document.getElementById('injuriesGrid');
    if (!container || !EPL_DATA.players) return;

    const injuredPlayers = EPL_DATA.players.filter(p => p.status !== 'ready' && p.injuryReason);

    if (injuredPlayers.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Hiện không có báo cáo chấn thương nào đặc biệt.</div>`;
      return;
    }

    container.innerHTML = injuredPlayers.map(p => {
      const team = EPL_DATA.teams.find(t => t.id === p.teamId) || { name: 'CLB' };
      let pillClass = 'pill-out';
      let pillText = 'VẮNG MẶT';

      if (p.status === 'doubtful') {
        pillClass = 'pill-doubtful';
        pillText = `NGHI NGỜ (${p.chanceOfPlaying !== null && p.chanceOfPlaying !== undefined ? p.chanceOfPlaying + '%' : '50%'})`;
      } else if (p.status === 'suspended') {
        pillClass = 'pill-suspended';
        pillText = 'TREO GIÒ';
      }

      const numText = (p.number && p.number > 0) ? `#${p.number}` : p.pos;

      return `
        <div class="injury-card ${p.status}">
          <div class="injury-card-top">
            <div class="injury-player-name">${escapeHtml(p.webName || p.name)} (${escapeHtml(numText)})</div>
            <span class="injury-status-pill ${pillClass}">${escapeHtml(pillText)}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--epl-green); margin-bottom: 4px; font-weight: 600;">
            ${escapeHtml(team.name)} - ${escapeHtml(p.pos)}
          </div>
          <div class="injury-desc">
            🩺 Tình trạng: <strong>${escapeHtml(this.translateInjury(p.injuryReason))}</strong>
          </div>
        </div>
      `;
    }).join('');
  },

  // 7. Modal Cầu Thủ (Căn Giữa Chuẩn Màn Hình & Typography Đẹp)
  openModal(playerId) {
    const p = EPL_DATA.players.find(x => x.id === playerId);
    if (!p) return;

    const team = EPL_DATA.teams.find(t => t.id === p.teamId) || { name: 'Ngoại Hạng Anh' };

    const numBadge = document.getElementById('modalNumber');
    if (numBadge) {
      if (p.number && p.number > 0) {
        numBadge.textContent = `#${p.number}`;
        numBadge.style.fontSize = '1.6rem';
      } else {
        numBadge.textContent = p.pos;
        numBadge.style.fontSize = '1.2rem';
      }
    }

    const posNames = { 'GK': 'Thủ Môn', 'DF': 'Hậu Vệ', 'MF': 'Tiền Vệ', 'FW': 'Tiền Đạo' };
    const posText = posNames[p.pos] || p.pos;

    document.getElementById('modalName').textContent = p.name;
    document.getElementById('modalTeamPos').textContent = `${posText} | ${team.name} ${p.cost ? '| Giá FPL: ' + p.cost : ''}`;

    document.getElementById('modalGoals').textContent = p.goals;
    document.getElementById('modalAssists').textContent = p.assists;

    // Chỉ hiển thị thông số Giữ sạch lưới đối với Thủ môn (GK)
    const cleanSheetsBox = document.getElementById('modalCleanSheetsBox');
    if (cleanSheetsBox) {
      if (p.pos === 'GK') {
        cleanSheetsBox.style.display = '';
        document.getElementById('modalCleanSheets').textContent = p.cleanSheets;
      } else {
        cleanSheetsBox.style.display = 'none';
      }
    }

    document.getElementById('modalYellow').textContent = p.yellow;
    document.getElementById('modalRed').textContent = p.red;

    const fplPointsEl = document.getElementById('modalFplPoints');
    if (fplPointsEl) {
      fplPointsEl.textContent = p.fplPoints || 0;
    }

    const statusBox = document.getElementById('modalStatusBox');
    if (p.status === 'ready') {
      statusBox.innerHTML = `🟢 <strong>Trạng thái thể lực:</strong> Sẵn sàng thi đấu 100%.`;
      statusBox.style.color = '#12bb45';
    } else {
      const reasonVN = this.translateInjury(p.injuryReason);
      statusBox.innerHTML = `⚠️ <strong>Tình trạng:</strong> ${reasonVN}.`;
      statusBox.style.color = '#ffb800';
    }

    const modal = document.getElementById('playerModal');
    modal.classList.add('open');
  },

  closeModal() {
    const modal = document.getElementById('playerModal');
    if (modal) modal.classList.remove('open');
  },

  handleModalOverlayClick(e) {
    if (e.target.id === 'playerModal') {
      this.closeModal();
    }
  },

  // 8. Tìm kiếm nhanh
  handleSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return;

    const matchedTeam = EPL_DATA.teams.find(t => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q));
    if (matchedTeam && q.length >= 3) {
      this.viewClubDetail(matchedTeam.id);
      return;
    }

    const matchedPlayer = EPL_DATA.players.find(p => p.name.toLowerCase().includes(q) || (p.webName && p.webName.toLowerCase().includes(q)));
    if (matchedPlayer && q.length >= 3) {
      this.openModal(matchedPlayer.id);
    }
  },

  // 9. Đội bóng yêu thích
  populateFavoriteDropdown() {
    const select = document.getElementById('favoriteTeamSelect');
    if (!select || !EPL_DATA.teams) return;

    select.innerHTML = `<option value="">⭐ Chọn CLB Yêu Thích</option>` +
      EPL_DATA.teams.map(t => `
        <option value="${t.id}" ${Number(this.favoriteTeamId) === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>
      `).join('');
  },

  setFavoriteTeam(teamId) {
    this.favoriteTeamId = teamId;
    if (teamId) {
      localStorage.setItem('epl_favorite_team', teamId);
      this.highlightFavoriteTeam(Number(teamId));
    } else {
      localStorage.removeItem('epl_favorite_team');
      document.getElementById('favoriteTeamBanner').style.display = 'none';
    }
    this.renderStandings();
  },

  highlightFavoriteTeam(teamId) {
    const team = EPL_DATA.teams.find(t => t.id === teamId);
    const banner = document.getElementById('favoriteTeamBanner');
    if (team && banner) {
      banner.style.display = 'block';
      banner.innerHTML = `
        <div style="background: rgba(0, 255, 135, 0.15); border: 1px solid var(--epl-green); border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="app.viewClubDetail(${team.id})">
          <img src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.name)}" style="width: 22px; height: 22px;">
          <span style="font-size: 0.82rem; font-weight: 700;">CLB bạn yêu thích: ${escapeHtml(team.name)}</span>
        </div>
      `;
    }
  },

  // 10. Làm mới thủ công
  refreshData() {
    this.syncLiveFPLData(true);
  }
};

// Tự động khởi chạy
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

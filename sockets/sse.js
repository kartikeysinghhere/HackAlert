class SSEService {
  constructor() {
    this.teamClients = {}; // { teamId: [res1, res2, ...] }
    this.dmClients = {};   // { dmKey: [res1, res2, ...] }
  }

  addTeamClient(teamId, res) {
    if (!this.teamClients[teamId]) this.teamClients[teamId] = [];
    this.teamClients[teamId].push(res);
  }

  removeTeamClient(teamId, res) {
    if (this.teamClients[teamId]) {
      this.teamClients[teamId] = this.teamClients[teamId].filter(c => c !== res);
    }
  }

  broadcastToTeam(teamId, data) {
    if (this.teamClients[teamId]) {
      this.teamClients[teamId].forEach(client => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  }

  addDMClient(dmKey, res) {
    if (!this.dmClients[dmKey]) this.dmClients[dmKey] = [];
    this.dmClients[dmKey].push(res);
  }

  removeDMClient(dmKey, res) {
    if (this.dmClients[dmKey]) {
      this.dmClients[dmKey] = this.dmClients[dmKey].filter(c => c !== res);
    }
  }

  broadcastToDM(dmKey, data) {
    if (this.dmClients[dmKey]) {
      this.dmClients[dmKey].forEach(client => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  }
}

module.exports = new SSEService();

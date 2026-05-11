const dmClients = {};

const addClient = (dmKey, res) => {
  if (!dmClients[dmKey]) dmClients[dmKey] = [];
  dmClients[dmKey].push(res);
};

const removeClient = (dmKey, res) => {
  if (dmClients[dmKey]) {
    dmClients[dmKey] = dmClients[dmKey].filter(c => c !== res);
  }
};

const broadcastToKey = (dmKey, data) => {
  if (dmClients[dmKey]) {
    dmClients[dmKey].forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
};

module.exports = {
  addClient,
  removeClient,
  broadcastToKey
};

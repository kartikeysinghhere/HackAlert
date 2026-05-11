const formatResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

module.exports = {
  formatResponse
};

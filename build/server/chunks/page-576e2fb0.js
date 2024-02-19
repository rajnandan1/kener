import fs from 'fs-extra';

const FetchData = async function(monitor) {
  return fs.readJsonSync(monitor.path90Day);
};

export { FetchData as F };
//# sourceMappingURL=page-576e2fb0.js.map

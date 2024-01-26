import { j as json } from './index-2b68e648.js';
import { a as auth, s as store } from './webhook-3bf785c0.js';
import 'fs-extra';
import './shared-server-58a5f352.js';
import './tool-153dc604.js';
import './github-9db56498.js';
import 'axios';
import 'marked';
import 'randomstring';

async function POST({ request }) {
  const payload = await request.json();
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  let resp = store(payload);
  return json(resp, {
    status: resp.status
  });
}

export { POST };
//# sourceMappingURL=_server-526da8a6.js.map

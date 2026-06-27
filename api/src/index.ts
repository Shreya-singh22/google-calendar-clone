import 'dotenv/config'; // Must be first so env vars are set before anything else loads
import app from './app';

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`Calendar API running on http://localhost:${port}`);
});

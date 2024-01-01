import axios from 'axios'
import fs from 'fs-extra'
export async function load({ params, route, url, parent }) {
	// const { data } = await axios.get('https://raw.githubusercontent.com/rajnandan1/kener/main/docs.md')
	const data = fs.readFileSync("/Users/raj/kener/docs.md", "utf8");
	return {
        md: data,
    };
}
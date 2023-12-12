import axios from 'axios'

export async function load({ params, route, url, parent }) {
    //read https://raw.githubusercontent.com/rajnandan1/kener/main/docs.md
	//return content
	const { data } = await axios.get('https://raw.githubusercontent.com/rajnandan1/kener/main/docs.md')
	return {
        md: data,
    };
}
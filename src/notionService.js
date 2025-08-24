import axios from 'axios';


export const fetchNotionPage = async () => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/notion-page`, {
    });
    console.log(response)
    return response.data;
  } catch (error) {
    console.error('Error fetching data from Notion:', error);
    throw error;
  }
};
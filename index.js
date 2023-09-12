const express = require("express");
const axios = require("axios");
const app = express();
require("dotenv").config({ path: ".env" });

// Функция для получения токена по API AmoCRM
async function getToken() {
  const auth_data = {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code: process.env.CODE,
    redirect_uri: process.env.REDIRECT_URI,
  };

  const res = await axios.post(
    `https://${process.env.SUBDOMEIN}.amocrm.ru/oauth2/access_token`,
    auth_data
  );

  return res.data.access_token;
}

app.get("/contact", async (req, res) => {
  const accessToken = await getToken();

  const { name, email, phone } = req.query;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Проверяем существование контакта
  let response = await axios.get(
    `https://${process.env.SUBDOMEIN}.amocrm.ru/api/v4/contacts?filter[email]=${email}&filter[phone_number]=${phone}`,
    { headers }
  );
  const data = response.data;

  // Если контакт не найден - создаем новый
  if (data.length === 0) {
    response = await axios.post(
      `https://${process.env.SUBDOMEIN}.amocrm.ru/api/v4/contacts`,
      {
        name: [name],
        emails: [{ email: email, is_primary: true }],
        phones: [{ phone: phone, is_primary: true }],
      },
      { headers }
    );

    if (response.status === 201) res.send("Contact created");
    else res.send("Error creating contact");

    // Если контакт найден - обновляем его данные
  } else if (data.length > 0) {
    response = await axios.patch(
      `https://${process.env.SUBDOMEIN}.amocrm.ru/api/v4/contacts/${data._embedded.contacts[0].id}`,
      {
        name: [name],
        emails: [{ email: email }],
        phones: [{ phone: phone }],
      },
      { headers }
    );

    if (response.status === 200) res.send("Contact updated");
    else res.send("Error updating contact");
  }

  //Создаем сделку
  const newDeal = await axios.post(
    `https://${process.env.SUBDOMEIN}.amocrm.ru/api/v4/leads`,
    {
      name: ["New Deal"],
      status_id: [142],
      contacts: [{ id: data._embedded.contacts[0].id }],
    },
    { headers }
  );

  if (newDeal.status === 201 || newDeal.status === 200)
    return res.status(201).send(newDeal.data);
  else return res.send("Error creating deal");
});

app.listen(process.env.PORT, () => {
  console.log(`Server listening at http://localhost:${process.env.PORT}`);
});

const server = require('express').Router();
const axios = require('axios');
const redis = require('redis');

const REDIS_PORT = process.env.PORT || 6379
const client = redis.createClient(REDIS_PORT)

server.get('/search', (req, res) => {                                   //BUSCA PRODUCTOS Y GUARDA EN CACHE
    const notQuery = req.query.q;
    var query = notQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); //---> Saco caracteres especiales como la Ñ o tildes, sino axios me tira un error.
    //creacion de CACHE con redis
    client.get(query, (err, data) => {
        /*
            el metodo .get de redis va a consultar en sus keys si existe una propiedad con ese nombre, en este caso una propiedad con el nombre que 
            llegue por query params y si al consultar la key es distinto de 'null' va a traer lo que tenia guardado
        */
        if(data !== null) {
            var resp = JSON.parse(data)
            var total = resp.resultados.length
            res.json({
                total,
                resultados: resp.resultados
            })
        /* 
            y si no tenia nada en su key va a proceder a hacer la peticion a la API para luego guardar la nueva key con sus resultados
        */
        } else {
            axios.get(`https://api.mercadolibre.com/sites/MLA/search?q=${query}`)
                .then(data => {
                    //guardo los solo los resultados de la busquedad en una variable
                    var results = data.data.results;
                    return results
                }).then(results => {
                    var arr = [];
                    //recorro los resultados para poder manipular los datos a mi gusto para devolverlo como JSON
                    for (let i = 0; i < results.length; i++) {
                        arr.push({
                            id: results[i].id,
                            image: results[i].thumbnail,
                            name: results[i].title,
                            price: results[i].price,
                            currency: results[i].currency_id,
                            stock: results[i].available_quantity,
                            sold: results[i].sold_quantity,
                            condition: results[i].condition
                        })
                    };
                    var total = arr.length;
                    //lo devuelvo como JSON
                    var resps = {
                        total,
                        resultados: arr
                    }
                    client.setex(query, 3600, JSON.stringify(resps));
                    
                    res.json({
                        total,
                        resultados: arr
                    })
                }).catch(err => {
                    console.log('Error: ', err);
                    res.status(404).send('Internal Error')
                })
        }
    })
})

server.get('/categories', (req, res) => {                               //BUSCA LAS CATEGORIAS GENERALES DE ML

    client.get("categories", (err, data) => {
        if(data !== null) {
            var cache = JSON.parse(data)
            
            res.json({
                resultados: cache.resultados
            })
        } else {
            axios.get('https://api.mercadolibre.com/sites/MLA/')
                .then(data => {
                    var results = data.data.categories;

                    var cache = {
                        resultados: results
                    };

                    client.setex("categories", 8000, JSON.stringify(cache))

                    res.json({
                        resultados: results
                    })
            })
        }
    })

})

server.get('/categories/:name', (req, res) => {                         //BUSCA CATEGORIA GENERAL POR NOMBRE
    const name = req.params.name

    client.get(name, (err, data) => {
        if(data !== null) {
            var cache = JSON.parse(data)
            res.json({
                resultados: cache.resultados
            })
        } else {
            /* 
                Hago un replace por que cuando busco una categoria que lleva espacios como por ejemplo 
                "Accesorios para Vehículos" por params me devuelve un string reemplazando los espacios por "%20" ej:  
                "Accesorios%20para%20Vehículos" 
            */
            var nuevoName = name.replace('%20', ' ') //reemplazo el %20 por un " "
            /*
                Peticion a mi propia ruta para obtener las categorias y poder manipular los datos a mi gusto
            */
            axios.get(`http://localhost:3001/api/categories`)
                .then(data => {
                    var results = data.data.resultados;
                    var arr = [];
                    //recorro el array que quedo guardado en la variable 'results' para poder pushear a la variable 'arr' solo el id de la categoria
                    for (let i = 0; i < results.length; i++) {
                        if( nuevoName === results[i].name ) {
                            arr.push(results[i].id)
                        }
                    }
                    return arr
                }).then(name => {
                    const prods = axios.get(`https://api.mercadolibre.com/sites/MLA/search?category=${name}`)
                    return prods
                }).then(products => {
                    var results = products.data.results;
                    var arr = [];
                    for (let i = 0; i < results.length; i++) {
                        arr.push({
                            id: results[i].id,
                            image: results[i].thumbnail,
                            name: results[i].title,
                            price: results[i].price,
                            stock: results[i].available_quantity,
                            sold: results[i].sold_quantity,
                            condition: results[i].condition
                        })
                    };

                    var cache = {
                        resultados: arr
                    }

                    client.setex(name, 8000, JSON.stringify(cache));

                    res.json({
                        resultados: arr
                    })
                }).catch(err => {
                    console.log('/categories/:name ERROR: ', err)
                })           
        }
    })
})

server.get('/product/:id', (req, res) => {                              //VER LA INFORMACION DE UN PRODUCTO
    const id = req.params.id
    client.get(id, (err, data) => {
        if(data !== null) {
            var cache = JSON.parse(data)
            res.json({
                producto: cache.producto
            })
        } else {
            axios.get(`https://api.mercadolibre.com/items/${id}`)
                .then(data => {
                    var result = data.data;
                    console.log(result)
                    var product = [{
                        id: result.id,
                        name: result.title,
                        price: result.price,
                        stock: result.available_quantity,
                        sold: result.sold_quantity,
                        currency: result.currency_id,
                        condition: result.condition,
                        link: result.permalink,
                        address: result.seller_address,
                        warranty: result.warranty,
                        images: []
                    }];
                    for (let i = 0; i < result.pictures.length; i++) {
                        product[0].images.push(result.pictures[i].url)
                    }
                    return product;
                }).then(product => {
                    var resp = {
                        producto: product
                    }
                    client.setex(id, 3600, JSON.stringify(resp))
                    res.json(resp)
                })
        }
    })
})

module.exports = server;
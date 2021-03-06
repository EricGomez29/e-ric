import React from 'react';
import { NavLink } from 'react-router-dom';
import style from '../Styles/Home.module.css';
import fondo from '../img/fondo-madera.jpg'
import PieDePagina from './PieDePagina';

export default function Home() {

    return (
        <div>
            <div className={style.homeImg}>
                <img src={fondo} style={{ width: "100%", height: "100%"}}/>
            </div>
            <div className="jumbotron" style={{backgroundColor: "transparent", paddingTop:"98px"}}>
                <div className= {style.divh1}>
                    <h1 className="display-3" style={{textTransform: "none", color: "white", fontFamily: "system-ui", paddingBottom: "20px"}}>Bienvenido y gracias por visitar nuestra pagina!</h1>
                </div>
                <hr className="my-4" />
                <p className={style.divh1} style={{color: "white"}}>Puedes comenzar a buscar tus productos, marcas o más mediante la seccion de categorias o simplemente utilizar la barra de busqueda, asi de simple !</p>
                <p className="lead bg-secondary">
                    <NavLink className="btn btn-primary btn-lg" to='/products/categories' role="button" style={{width: "100%"}}>Ver categorias</NavLink>
                </p>
            </div>
            <PieDePagina />
        </div>
    )
}
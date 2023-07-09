
import { toast } from 'react-toastify';

  
export const addNotify = (title, type) => {
    let settings = {
        position: "bottom-center",
        autoClose: 3500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
    };
    if(!type) toast(title, settings)
    else if(type === "error") toast.error(title, settings)
    else if(type === "success") toast.success(title, settings)
    else if(type === "warning") toast.warning(title, settings)
    else if(type === "info") toast.info(title, settings)
}

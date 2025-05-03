from fastapi import status
from fastapi.responses import JSONResponse
from typing import Any, Dict, List, Optional, Union
import logging

logger = logging.getLogger(__name__)

def success_response(
    data: Any = None, 
    message: str = "Operation successful", 
    status_code: int = status.HTTP_200_OK
) -> JSONResponse:
    """
    Create a standardized success response
    
    Args:
        data: Response data payload
        message: Success message
        status_code: HTTP status code
        
    Returns:
        JSONResponse: Standardized success response
    """
    content = {
        "success": True,
        "message": message,
    }
    
    if data is not None:
        if isinstance(data, dict) and not isinstance(data, list):
            # If data is a dict, merge with content at top level
            for key, value in data.items():
                content[key] = value
        else:
            # Otherwise, add as data field
            content["data"] = data
    
    return JSONResponse(
        content=content,
        status_code=status_code
    )

def error_response(
    message: str = "An error occurred",
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    error_details: Optional[Dict] = None
) -> JSONResponse:
    """
    Create a standardized error response
    
    Args:
        message: Error message
        status_code: HTTP status code
        error_details: Additional error details
        
    Returns:
        JSONResponse: Standardized error response
    """
    content = {
        "success": False,
        "message": message,
    }
    
    if error_details:
        content["error_details"] = error_details
    
    return JSONResponse(
        content=content,
        status_code=status_code
    )

def not_found_response(resource_name: str = "Resource") -> JSONResponse:
    """
    Create a standardized 404 Not Found response
    
    Args:
        resource_name: Name of the resource that wasn't found
        
    Returns:
        JSONResponse: Standardized not found response
    """
    return error_response(
        message=f"{resource_name} not found",
        status_code=status.HTTP_404_NOT_FOUND
    )

def validation_error_response(errors: Dict[str, List[str]]) -> JSONResponse:
    """
    Create a standardized validation error response
    
    Args:
        errors: Dictionary of field validation errors
        
    Returns:
        JSONResponse: Standardized validation error response
    """
    return error_response(
        message="Validation error",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_details={"validation_errors": errors}
    )

def unauthorized_response(message: str = "Unauthorized") -> JSONResponse:
    """
    Create a standardized unauthorized response
    
    Args:
        message: Unauthorized message
        
    Returns:
        JSONResponse: Standardized unauthorized response
    """
    return error_response(
        message=message,
        status_code=status.HTTP_401_UNAUTHORIZED
    )

def forbidden_response(message: str = "Forbidden") -> JSONResponse:
    """
    Create a standardized forbidden response
    
    Args:
        message: Forbidden message
        
    Returns:
        JSONResponse: Standardized forbidden response
    """
    return error_response(
        message=message,
        status_code=status.HTTP_403_FORBIDDEN
    ) 